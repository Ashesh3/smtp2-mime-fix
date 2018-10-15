const smtp = require('..');

smtp.send({
  from: 'mail@lsong.org',
  to: 'hi@lsong.org',
  subject: 'hello world',
  body: {
    _: 'This is a test message, do not reply.'
  }
}, {
  // tls: true,
  // port: 587,
  // host: 'lsong.org'
}).then(res => {
  console.log(res);
}, err => {
  console.error('smtp send error:', err);
});