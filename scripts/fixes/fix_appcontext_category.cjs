const fs = require('fs');

let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

content = content.replace(
  /category: 'provisions' \| 'perishable';/g,
  "category: IngredientCategory;"
);

fs.writeFileSync('src/context/AppContext.tsx', content);
