const EventEmitter = require('events');
const createParser = require('./parser');

const createReader = done => {
  let buffer = '';
  return chunk => {
    buffer += chunk;
    if(`${chunk}`.indexOf('.') === 0){ // "."
      done(buffer);
    }
  }
}

class Connection extends EventEmitter {
  constructor(socket){
    super();
    this.socket = socket;
    this.socket.on('error', err => {
      this.emit('error', err);
    });
    this.parser = createParser((cmd, parameter) => {
      this.exec(cmd, parameter);
      this.emit(cmd, parameter);
      this.emit('command', cmd, parameter);
    });
    this.message = {};
    this.socket.on('data', this.parser);
  }
  write(buffer){
    this.socket.write(buffer);
    return this;
  }
  response(code, message){
    return this.write(`${code} ${message}\r\n`);
  }
  close(){
    this.socket.end();
    return this;
  }
  exec(cmd, parameter){
    switch(cmd){
      case 'HELO':
      case 'EHLO':
        this.message = {};
        this.message.hostname = parameter;
        this.response(250, 'OK');
        break;
      case 'MAIL':
        this.message.from = parameter.split(':')[1];
        this.response(250, 'OK');
        break;
      case 'RCPT':
        (this.message['recipients'] ||
        (this.message['recipients'] = [])).push(parameter.split(':')[1]);
        this.response(250, 'OK');
        break;
      case 'DATA':
        const reader = createReader(content => {
          this.socket.on('data', this.parser);
          this.socket.removeListener('data', reader);
          const size = Buffer.byteLength(content);
          this.response(250, `OK ${size} bytes received`);
          this.message.content = content;
          this.emit('message', this.message);
        });
        this.socket.on('data', reader);
        this.socket.removeListener('data', this.parser);
        this.response(354, 'start input end with . (dot)');
        break;
      case 'QUIT':
        this.response(221, 'Bye');
        this.close();
        break;
      default:
        break;
    }
  }
}

module.exports = Connection;