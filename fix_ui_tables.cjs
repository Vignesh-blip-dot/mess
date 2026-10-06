const fs = require('fs');
let content = fs.readFileSync('src/components/IngredientsView.tsx', 'utf8');

content = content.replace(
  "item.category === 'provisions'\n                              ? 'bg-[#f5f2eb] text-[#131715] border border-[#e5e0d5]'\n                              : 'bg-[#e6f0ea] text-[#193d2c] border border-[#193d2c]/20'",
  "item.category === 'provisions'\n                              ? 'bg-[#f5f2eb] text-[#131715] border border-[#e5e0d5]'\n                              : item.category === 'vegetable' ? 'bg-[#e6f0ea] text-[#193d2c] border border-[#193d2c]/20' : 'bg-[#e6f0ea] text-[#193d2c] border border-[#193d2c]/20'"
);

fs.writeFileSync('src/components/IngredientsView.tsx', content);
