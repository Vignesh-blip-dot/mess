const fs = require('fs');
let content = fs.readFileSync('src/components/LogUsageView.tsx', 'utf8');

content = content.replace(
  "return ing?.category === 'provisions';",
  "return ing?.category !== 'provisions'; // require meal type for perishable/vegetable"
);

fs.writeFileSync('src/components/LogUsageView.tsx', content);
