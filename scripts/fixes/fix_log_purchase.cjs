const fs = require('fs');

let content = fs.readFileSync('src/components/LogPurchaseView.tsx', 'utf8');

// Replace activeIngredients with ingredients, then compute activeIngredients
content = content.replace(
  /const {\n\s*activeIngredients,/,
  `const {\n    ingredients,`
);

content = content.replace(
  /const todayStr/,
  `const activeIngredients = ingredients.filter((i) => i.active);\n  const todayStr`
);

fs.writeFileSync('src/components/LogPurchaseView.tsx', content);
