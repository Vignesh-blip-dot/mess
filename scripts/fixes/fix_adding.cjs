const fs = require('fs');

let content = fs.readFileSync('src/components/AddIngredientView.tsx', 'utf8');
content = content.replace(
  "useState<'provisions' | 'perishable'>('provisions')",
  "useState<import('../types').IngredientCategory>('provisions')"
);

content = content.replace(
  "as 'provisions' | 'perishable')",
  "as import('../types').IngredientCategory)"
);

content = content.replace(
  '<option value="perishable">Perishable (Daily)</option>',
  '<option value="perishable">Perishable (Daily)</option>\n                <option value="vegetable">Vegetables</option>'
);

fs.writeFileSync('src/components/AddIngredientView.tsx', content);
