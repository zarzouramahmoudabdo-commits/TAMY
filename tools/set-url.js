const fs = require('fs');
const url = process.argv[2];
if (!url) { console.error('usage: node tools/set-url.js <url>'); process.exit(1); }
const f = 'capacitor.config.json';
const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
cfg.server = Object.assign({}, cfg.server, { url: url.endsWith('/') ? url : url + '/' });
fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + '\n');
console.log('server.url =', cfg.server.url);
