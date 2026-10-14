const fs = require('fs');

function unescape(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\\$/g, '$');
  content = content.replace(/\\`/g, '`');
  fs.writeFileSync(file, content);
}

unescape('src/components/LogPurchaseView.tsx');
unescape('src/components/LogUsageView.tsx');
