const fs = require('fs');
let content = fs.readFileSync('src/components/Navigation.tsx', 'utf8');

if (!content.includes("'vegetable-inventory'")) {
  content = content.replace(
    "{ id: 'ingredients', label: 'Ingredients & Stock', icon: Package, roles: ['admin', 'incharge', 'coordinator'] },",
    "{ id: 'ingredients', label: 'Provisions & Perishables', icon: Package, roles: ['admin', 'incharge', 'coordinator'] },\n  { id: 'vegetable-inventory', label: 'Vegetable Inventory', icon: Package, roles: ['admin', 'incharge', 'coordinator'] },"
  );
  
  content = content.replace(
    "export type PageId = ",
    "export type PageId = 'vegetable-inventory' | 'log-veg-purchase' | 'log-veg-usage' | "
  );
}
fs.writeFileSync('src/components/Navigation.tsx', content);
