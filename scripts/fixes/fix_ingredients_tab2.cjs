const fs = require('fs');
let content = fs.readFileSync('src/components/IngredientsView.tsx', 'utf8');

const oldTabs = `            <button
              onClick={() => setActiveTab('perishable')}
              className={\`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${
                activeTab === 'perishable'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb]'
              }\`}
            >
              Perishables ({perishablesCount})
            </button>`;

const vegetableCountCode = `\n  const vegetablesCount = ingredients.filter((i) => i.category === 'vegetable').length;`;

if (content.includes('perishablesCount = ingredients')) {
  content = content.replace(
    "const perishablesCount = ingredients.filter((i) => i.category === 'perishable').length;",
    "const perishablesCount = ingredients.filter((i) => i.category === 'perishable').length;" + vegetableCountCode
  );
}

const newTabs = `            <button
              onClick={() => setActiveTab('perishable')}
              className={\`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${
                activeTab === 'perishable'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb]'
              }\`}
            >
              Perishables ({perishablesCount})
            </button>
            <button
              onClick={() => setActiveTab('vegetable')}
              className={\`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${
                activeTab === 'vegetable'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb]'
              }\`}
            >
              Vegetables ({vegetablesCount})
            </button>`;

content = content.replace(oldTabs, newTabs);
fs.writeFileSync('src/components/IngredientsView.tsx', content);
console.log('done');
