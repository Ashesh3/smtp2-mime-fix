const smtp = require('..');

smtp.send('hi@lsong.org', {
  subject: 'hello world',
  content: 'This is a test message, do not reply.'
}).then(res => {
  console.log(res);
});