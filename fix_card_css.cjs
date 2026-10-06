const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(/--card: #2c1e16;/g, '--card: #ffffff;');
css = css.replace(/--card-elevated: #2c1e16;/g, '--card-elevated: #ffffff;');
fs.writeFileSync('src/index.css', css);
