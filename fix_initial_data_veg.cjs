const fs = require('fs');
let content = fs.readFileSync('src/lib/initialData.ts', 'utf8');

content = content.replace(
  "ingredient_id: 'ing-11',\n    name: 'Fresh Tomatoes',\n    name_telugu: 'టమాటాలు',\n    category: 'perishable'",
  "ingredient_id: 'ing-11',\n    name: 'Fresh Tomatoes',\n    name_telugu: 'టమాటాలు',\n    category: 'vegetable'"
);

content = content.replace(
  "ingredient_id: 'ing-12',\n    name: 'Nasik Red Onions',\n    name_telugu: 'ఉల్లిపాయలు',\n    category: 'perishable'",
  "ingredient_id: 'ing-12',\n    name: 'Nasik Red Onions',\n    name_telugu: 'ఉల్లిపాయలు',\n    category: 'vegetable'"
);

content = content.replace(
  "ingredient_id: 'ing-13',\n    name: 'Fresh Potatoes (Aloo)',\n    name_telugu: 'బంగాళాదుంపలు',\n    category: 'perishable'",
  "ingredient_id: 'ing-13',\n    name: 'Fresh Potatoes (Aloo)',\n    name_telugu: 'బంగాళాదుంపలు',\n    category: 'vegetable'"
);

fs.writeFileSync('src/lib/initialData.ts', content);
