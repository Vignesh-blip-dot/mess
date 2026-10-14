const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

content = content.replace(
  "const itemMeal = ing.category === 'perishable' ? null : (mealType || null);",
  "const itemMeal = (ing.category === 'perishable' || ing.category === 'vegetable') ? null : (mealType || null);"
);

fs.writeFileSync('src/context/AppContext.tsx', content);
