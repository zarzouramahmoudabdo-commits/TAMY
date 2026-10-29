// يضبط server.url في capacitor.config.json (يُستدعى من الـ workflow)
const fs = require('fs');
const f = 'capacitor.config.json';
const c = JSON.parse(fs.readFileSync(f, 'utf8'));
c.server = Object.assign({}, c.server, { url: process.argv[2] });
fs.writeFileSync(f, JSON.stringify(c, null, 2) + '\n');
console.log('server.url =', c.server.url);
