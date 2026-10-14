const fs = require('fs');
let content = fs.readFileSync('src/components/MonthlyReportView.tsx', 'utf8');

const oldRows = `  const provisionsRows: IngredientMonthLine[] = [];
  const perishableRows: IngredientMonthLine[] = [];

  Object.values(perIngredient).forEach((line) => {
    const ing = ingredients.find((i) => i.ingredient_id === line.id);
    line.opening = openingByIngredient[line.id] || 0;
    line.closing = line.opening + line.netQty;
    line.closingValue = line.closing * (ing?.current_price || 0);

    if (line.category === 'provisions') {
      provisionsRows.push(line);
    } else {
      perishableRows.push(line);
    }
  });`;
  
const newRows = `  const provisionsRows: IngredientMonthLine[] = [];
  const perishableRows: IngredientMonthLine[] = [];
  const vegetableRows: IngredientMonthLine[] = [];

  Object.values(perIngredient).forEach((line) => {
    const ing = ingredients.find((i) => i.ingredient_id === line.id);
    line.opening = openingByIngredient[line.id] || 0;
    line.closing = line.opening + line.netQty;
    line.closingValue = line.closing * (ing?.current_price || 0);

    if (line.category === 'provisions') {
      provisionsRows.push(line);
    } else if (line.category === 'vegetable') {
      vegetableRows.push(line);
    } else {
      perishableRows.push(line);
    }
  });`;

content = content.replace(oldRows, newRows);

fs.writeFileSync('src/components/MonthlyReportView.tsx', content);
