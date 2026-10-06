const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

const oldStockVal = `  const perishablesValue = ingredients
    .filter((i) => i.category === 'perishable')
    .reduce((sum, i) => sum + (i.current_stock * i.current_price || 0), 0);`;
    
const newStockVal = `  const perishablesValue = ingredients
    .filter((i) => i.category === 'perishable')
    .reduce((sum, i) => sum + (i.current_stock * i.current_price || 0), 0);
  const vegetablesValue = ingredients
    .filter((i) => i.category === 'vegetable')
    .reduce((sum, i) => sum + (i.current_stock * i.current_price || 0), 0);`;
    
content = content.replace(oldStockVal, newStockVal);

const oldPerishablesJSX = `        <div
          onClick={() => navigateTo('ingredients')}
          className="bg-white border border-[#e5e0d5] rounded-sm p-4 cursor-pointer hover:border-[#193d2c] transition-all shadow-[0_1px_3px_rgba(19,23,21,0.03)] hover:shadow-[0_2px_6px_rgba(19,23,21,0.06)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#59635e] font-medium">Perishables Value</span>
            <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
              <Sprout size={13} />
            </div>
          </div>
          <div className="font-mono-fig text-2xl font-bold text-[#131715]">
            {formatCurrency(perishablesValue)}
          </div>
          <span className="text-[11px] text-[#59635e] mt-1 block">
            Milk, eggs, vegetables & dairy items
          </span>
        </div>`;

const newPerishablesJSX = `        <div
          onClick={() => { navigateTo('ingredients'); }}
          className="bg-white border border-[#e5e0d5] rounded-sm p-4 cursor-pointer hover:border-[#193d2c] transition-all shadow-[0_1px_3px_rgba(19,23,21,0.03)] hover:shadow-[0_2px_6px_rgba(19,23,21,0.06)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#59635e] font-medium">Perishables Value</span>
            <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
              <Sprout size={13} />
            </div>
          </div>
          <div className="font-mono-fig text-2xl font-bold text-[#131715]">
            {formatCurrency(perishablesValue)}
          </div>
          <span className="text-[11px] text-[#59635e] mt-1 block">
            Milk, eggs & dairy items
          </span>
        </div>
        <div
          onClick={() => { navigateTo('ingredients'); }}
          className="bg-white border border-[#e5e0d5] rounded-sm p-4 cursor-pointer hover:border-[#193d2c] transition-all shadow-[0_1px_3px_rgba(19,23,21,0.03)] hover:shadow-[0_2px_6px_rgba(19,23,21,0.06)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#59635e] font-medium">Vegetables Value</span>
            <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
              <Sprout size={13} />
            </div>
          </div>
          <div className="font-mono-fig text-2xl font-bold text-[#131715]">
            {formatCurrency(vegetablesValue)}
          </div>
          <span className="text-[11px] text-[#59635e] mt-1 block">
            Fresh vegetables and greens
          </span>
        </div>`;

content = content.replace(oldPerishablesJSX, newPerishablesJSX);

// change grid cols from sm:grid-cols-3 to sm:grid-cols-4 or just keep it dynamic
content = content.replace('grid-cols-1 sm:grid-cols-3 gap-4 mb-8', 'grid-cols-1 sm:grid-cols-4 gap-4 mb-8');

fs.writeFileSync('src/components/DashboardView.tsx', content);
