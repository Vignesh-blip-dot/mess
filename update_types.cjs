const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');
if (!content.includes("'vegetable-inventory'")) {
  content = content.replace(
    "export type PageId =\n  | 'dashboard'",
    "export type PageId =\n  | 'dashboard'\n  | 'vegetable-inventory'\n  | 'log-veg-purchase'\n  | 'log-veg-usage'"
  );
  fs.writeFileSync('src/types.ts', content);
}
