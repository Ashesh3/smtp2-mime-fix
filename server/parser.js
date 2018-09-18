
module.exports = fn => {
  let buffer = '', parts;
  return chunk => {
    buffer += chunk;
    parts = buffer.split('\r\n');
    buffer = parts.pop();
    parts.forEach(line => {
      const m = line.match(/^(\S+)(?:\s+(.*))?$/);
      m && fn(m[1].toUpperCase(), m[2]);
    });
  }
};