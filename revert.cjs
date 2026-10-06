const fs = require('fs');
let content = fs.readFileSync('src/components/LogUsageView.tsx', 'utf8');

content = content.replace(
  "return ing?.category !== 'provisions'; // require meal type for perishable/vegetable",
  "return ing?.category === 'provisions';"
);

fs.writeFileSync('src/components/LogUsageView.tsx', content);
