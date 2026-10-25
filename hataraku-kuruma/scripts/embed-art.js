// Generated sprites stay editable as WebP files; the game also works as one HTML file.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/sprites.json')));
const sprites = Object.fromEntries(Object.keys(manifest).map(id => [
  id, 'data:image/webp;base64,' + fs.readFileSync(path.join(root, 'assets', id + '.webp')).toString('base64')
]));
const file = path.join(root, 'kuruma.html');
const html = fs.readFileSync(file, 'utf8');
const begin = '/* GENERATED SPRITES BEGIN */';
const end = '/* GENERATED SPRITES END */';
if (!html.includes(begin) || !html.includes(end)) throw new Error('Sprite markers missing');
fs.writeFileSync(file, html.slice(0, html.indexOf(begin)) + begin + '\nconst SPRITES=' +
  JSON.stringify(sprites) + ';\n' + html.slice(html.indexOf(end)));
console.log(Object.keys(sprites).length + ' sprites embedded');
