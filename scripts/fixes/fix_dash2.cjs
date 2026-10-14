const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

const regex = /<div\s+onClick=\{\(\) => navigateTo\('ingredients'\)\}\s+className="bg-white border border-\[#e5e0d5\] rounded-sm p-4 cursor-pointer hover:border-\[#193d2c\] transition-all shadow-\[0_1px_3px_rgba\(19,23,21,0\.03\)\] hover:shadow-\[0_2px_6px_rgba\(19,23,21,0\.06\)\]"\s*>\s*<div className="flex items-center justify-between mb-2">\s*<span className="text-xs text-\[#59635e\] font-medium">Perishables Value<\/span>.*?Milk, eggs, vegetables &amp; dairy items\s*<\/span>\s*<\/div>/s;

const match = content.match(regex);
if (match) {
  const oldDiv = match[0];
  const newDivs = oldDiv.replace('Milk, eggs, vegetables &amp; dairy items', 'Milk, eggs &amp; dairy items') + `
        <div
          onClick={() => navigateTo('ingredients')}
          className="bg-white border border-[#e5e0d5] rounded-sm p-4 cursor-pointer hover:border-[#193d2c] transition-all shadow-[0_1px_3px_rgba(19,23,21,0.03)] hover:shadow-[0_2px_6px_rgba(19,23,21,0.06)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#59635e] font-medium">Vegetables Value</span>
            <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
              <span className="font-bold text-[10px]">VEG</span>
            </div>
          </div>
          <div className="font-mono-fig text-2xl font-bold text-[#131715]">
            {formatCurrency(vegetablesValue)}
          </div>
          <span className="text-[11px] text-[#59635e] mt-1 block">
            Fresh vegetables and greens
          </span>
        </div>`;
  content = content.replace(oldDiv, newDivs);
  content = content.replace('grid-cols-1 sm:grid-cols-3 gap-4 mb-8', 'grid-cols-1 sm:grid-cols-4 gap-4 mb-8');
  fs.writeFileSync('src/components/DashboardView.tsx', content);
  console.log('done');
} else {
  console.log('not found');
}
