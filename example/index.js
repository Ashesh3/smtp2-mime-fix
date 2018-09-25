const smtp = require('..');

smtp.send({
  from: 'Liu song <hi@lsong.org>',
  to: 'song940@gmail.com',
  subject: 'hello world',
  body: {
    _: 'This is a test message, do not reply.'
  }
}).then(res => {
  console.log(res);
}, err => {
  console.error('smtp send error:', err);
});