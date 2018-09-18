const EventEmitter = require('events');

class SMTP extends EventEmitter {
  send(to, message){

  }
}

SMTP.Server = require('./server');
SMTP.createServer = (options, handler) => {
  return new SMTP.Server(options, handler);
};

SMTP.send = (to, message, options) => {
  const smtp = new SMTP(options);
  return smtp.send(to, message);
};

module.exports = SMTP;