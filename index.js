const dns = require('dns');
const net = require('net');
const tls = require('tls');
const util = require('util');
const assert = require('assert');
const Message = require('mime2');
const EventEmitter = require('events');
const createParser = require('./parser');

const debug = util.debuglog('smtp2');

const createReader = fn => {
  const r1 = /^(\d+)-(.+)$/;
  const r2 = /^(\d+)\s(.+)$/;
  let results = [];
  return createParser(line => {
    if(r1.test(line)){
      const m = line.match(r1);
      results.push(m[2]);
    }
    if(r2.test(line)){
      const m = line.match(r2);
      results.push(m[2]);
      fn(m[1], results);
      results = [];
    }
  });
}

class SMTP extends EventEmitter {
  constructor(options){
    super();
    Object.assign(this, {
      port: 25
    }, options);
  }
  resolve(domain){
    const resolveMx = util.promisify(dns.resolveMx);
    return resolveMx(domain)
    .catch(() => [])
    .then(records => {
      return records
        .sort((a, b) => a.priority - b. priority)
        .map(mx => mx.exchange)
        .concat([domain]);
    });
  }
  open(host, port){
    port = port || this.port;
    if(~host.indexOf(':')){
      [ host, port ] = host.split(':');
    }
    return new Promise((resolve, reject) => {
      const tcp = this.tls ? tls : net;
      const socket = tcp.connect(port, host, () => resolve(socket));
      socket.once('error', reject);
    });
  }
  connect(domain){
    const tryConnect = async hosts => {
      for(const host of hosts){
        try{
          const socket = await this.open(host);
          debug(`MX connection created: ${host}`);
          return socket;
        }catch(e){
          debug(`Error on connectMx for: ${host}`, e);
        }
      }
      throw new Error('can not connect to any SMTP server');
    };
    return this
      .resolve(domain)
      .then(tryConnect);
  }
  post(host, from, recipients, body){
    function* process(sock){
      let res = yield;
      assert.equal(res.code, 220, res.msg);
      if(/ESMTP/.test(res.msg[0])){
        res = yield `EHLO ${from.host}`;
      }else{
        res = yield `HELO ${from.host}`;
      }
      assert.equal(res.code, 250, res.msg);
      res = yield `MAIL FROM: <${from.address}>`;
      assert.equal(res.code, 250, res.msg);
      for(const rcpt of recipients){
        res = yield `RCPT TO: <${rcpt.address}>`;
        assert.equal(res.code, 250, res.msg);
      }
      res = yield 'DATA';
      assert.equal(res.code, 354, res.msg);
      sock.write(`${body}\r\n\r\n`);
      res = yield '.';
      assert.equal(res.code, 250, res.msg);
      res = yield 'QUIT';
      assert.equal(res.code, 221, res.msg);
      return res;
    }
    return this
      .connect(host)
      .then(socket => new Promise((resolve, reject) => {
        const gen = process(socket);
        gen.next();
        const reader = createReader((code, msg) => {
          debug('->', code, msg);
          const { done, value } = gen.next({ code, msg });
          if(done) return resolve(value);
          if(value){
            debug('send:', value);
            socket.write(`${value}\r\n`);
          }
        });
        socket.on('error', reject);
        socket.on('data', reader);
      }));
  }
  send(message){
    if(!(message instanceof Message))
      message = new Message(message);
    const recipients = [];
    if(message.to) recipients.push(message.to);
    if(message.cc) recipients.push(message.cc);
    if(message.bcc)recipients.push(message.bcc);
    const groupByHost = recipients.reduce((groupByHost, recipient) => {
      const addr = Message.parseAddress(recipient);
      (groupByHost[ addr.host ] ||
      (groupByHost[ addr.host ] = [])).push(addr);
      return groupByHost;
    }, {});
    const from = Message.parseAddress(message.from);
    return Promise.all(Object.keys(groupByHost).map(domain => 
      this.post(domain, from, groupByHost[domain], message.toString())));
  }
}

SMTP.send = (message, options) => {
  const smtp = new SMTP(options);
  return smtp.send(message);
};

SMTP.Server = require('./server');
SMTP.createServer = (options, handler) => {
  return new SMTP.Server(options, handler);
};

module.exports = SMTP;