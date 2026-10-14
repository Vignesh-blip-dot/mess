const fs = require('fs');
let content = fs.readFileSync('src/lib/initialData.ts', 'utf8');

content = content.replace(
  "{ name: 'Fresh Tomatoes', category: 'perishable', unit: 'kg' }",
  "{ name: 'Fresh Tomatoes', category: 'vegetable', unit: 'kg' }"
);

content = content.replace(
  "id: 'ing-004', name: 'Fresh Tomatoes', category: 'perishable'",
  "id: 'ing-004', name: 'Fresh Tomatoes', category: 'vegetable'"
);

content = content.replace(
  "id: 'ing-005', name: 'Nasik Red Onions', category: 'perishable'",
  "id: 'ing-005', name: 'Nasik Red Onions', category: 'vegetable'"
);

content = content.replace(
  "id: 'ing-006', name: 'Fresh Potatoes (Aloo)', category: 'perishable'",
  "id: 'ing-006', name: 'Fresh Potatoes (Aloo)', category: 'vegetable'"
);

fs.writeFileSync('src/lib/initialData.ts', content);
