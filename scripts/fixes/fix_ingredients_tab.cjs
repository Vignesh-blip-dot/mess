const fs = require('fs');
let content = fs.readFileSync('src/components/IngredientsView.tsx', 'utf8');

content = content.replace(
  "if (activeTab === 'zero' && (!item.active || item.current_stock > 0)) return false;",
  "if (activeTab === 'vegetable' && item.category !== 'vegetable') return false;\n    if (activeTab === 'zero' && (!item.active || item.current_stock > 0)) return false;"
);

fs.writeFileSync('src/components/IngredientsView.tsx', content);
