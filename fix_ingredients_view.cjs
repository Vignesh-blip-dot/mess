const fs = require('fs');

let content = fs.readFileSync('src/components/IngredientsView.tsx', 'utf8');

// Replace activeTab state
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'all' | 'provisions' | 'perishable' | 'zero'>('all');",
  "const [activeTab, setActiveTab] = useState<'provisions' | 'perishable' | 'vegetable'>('provisions');"
);

// Replace filter logic
const oldFilter = `  const filtered = ingredients.filter((item) => {
    if (activeTab === 'provisions' && item.category !== 'provisions') return false;
    if (activeTab === 'perishable' && item.category !== 'perishable') return false;
    if (activeTab === 'zero' && (!item.active || item.current_stock > 0)) return false;
    if (!searchTerm.trim()) return true;`;
const newFilter = `  const filtered = ingredients.filter((item) => {
    if (activeTab === 'provisions' && item.category !== 'provisions') return false;
    if (activeTab === 'perishable' && item.category !== 'perishable') return false;
    if (activeTab === 'vegetable' && item.category !== 'vegetable') return false;
    if (!searchTerm.trim()) return true;`;
content = content.replace(oldFilter, newFilter);

const oldTabs = `          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            <button
              onClick={() => setActiveTab('all')}
              className={\`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${
                activeTab === 'all'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'text-[#59635e] hover:bg-[#e6f0ea] hover:text-[#193d2c]'
              }\`}
            >
              All ({ingredients.length})
            </button>
            <button
              onClick={() => setActiveTab('provisions')}
              className={\`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${
                activeTab === 'provisions'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'text-[#59635e] hover:bg-[#e6f0ea] hover:text-[#193d2c]'
              }\`}
            >
              Provisions ({provisionsCount})
            </button>
            <button
              onClick={() => setActiveTab('perishable')}
              className={\`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${
                activeTab === 'perishable'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'text-[#59635e] hover:bg-[#e6f0ea] hover:text-[#193d2c]'
              }\`}
            >
              Perishables ({perishablesCount})
            </button>
            <button
              onClick={() => setActiveTab('zero')}
              className={\`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${
                activeTab === 'zero'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'text-[#59635e] hover:bg-[#faeaea] hover:text-[#942426]'
              }\`}
            >
              Out of Stock ({zeroStockCount})
            </button>
          </div>`;
          
const newTabs = `          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            <button
              onClick={() => setActiveTab('provisions')}
              className={\`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${
                activeTab === 'provisions'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'text-[#59635e] hover:bg-[#e6f0ea] hover:text-[#193d2c]'
              }\`}
            >
              Provisions ({ingredients.filter(i => i.category === 'provisions').length})
            </button>
            <button
              onClick={() => setActiveTab('perishable')}
              className={\`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${
                activeTab === 'perishable'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'text-[#59635e] hover:bg-[#e6f0ea] hover:text-[#193d2c]'
              }\`}
            >
              Perishables ({ingredients.filter(i => i.category === 'perishable').length})
            </button>
            <button
              onClick={() => setActiveTab('vegetable')}
              className={\`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${
                activeTab === 'vegetable'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'text-[#59635e] hover:bg-[#e6f0ea] hover:text-[#193d2c]'
              }\`}
            >
              Vegetables ({ingredients.filter(i => i.category === 'vegetable').length})
            </button>
          </div>`;
          
content = content.replace(oldTabs, newTabs);

fs.writeFileSync('src/components/IngredientsView.tsx', content);
