const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(/--paper: #f8f7f4;/g, '--paper: #0f1115;');
css = css.replace(/--card-subtle: #f5f2eb;/g, '--card-subtle: #1e222b;');
css = css.replace(/--gold-bg: #faf3e8;/g, '--gold-bg: #2a2411;');
css = css.replace(/--stamp-red-bg: #faeaea;/g, '--stamp-red-bg: #2a161a;');

css = css.replace(/background: #f0ece3;/g, 'background: #0f1115;');
css = css.replace(/background: #d4cec2;/g, 'background: #272a33;');
css = css.replace(/background: #aba394;/g, 'background: #333842;');

css = css.replace(/color: #000000 !important;/g, 'color: #ffffff !important;');

fs.writeFileSync('src/index.css', css);
