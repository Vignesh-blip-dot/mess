const fs = require('fs');
let content = fs.readFileSync('src/components/MonthlyReportView.tsx', 'utf8');

const match = content.match(/\{\/\* Perishables Ingredient Detail Table \*\/\}.*?<\/table>\s*<\/div>\s*\)\s*}\s*<\/div>/s);
if (match) {
  const pSection = match[0];
  const vSection = pSection
    .replace('Perishables Ingredient Detail Table', 'Vegetables Ingredient Detail Table')
    .replace('Perishables &middot; Detailed Stock Ledger', 'Vegetables &middot; Detailed Stock Ledger')
    .replace(/perishableRows/g, 'vegetableRows')
    .replace('No perishables activity', 'No vegetables activity');
    
  content = content.replace(pSection, pSection + '\n\n      {/* Vegetables Ingredient Detail Table */}\n      ' + vSection);
  
  // also add totalVegetablesCost
  content = content.replace(
    'const totalPerishablesCost = perishableRows.reduce((s, r) => s + r.usedCost, 0);',
    'const totalPerishablesCost = perishableRows.reduce((s, r) => s + r.usedCost, 0);\n  const totalVegetablesCost = vegetableRows.reduce((s, r) => s + r.usedCost, 0);'
  );
  
  // also add it to total expenditure
  content = content.replace(
    'const totalExpenditure = totalProvisionsCost + totalPerishablesCost;',
    'const totalExpenditure = totalProvisionsCost + totalPerishablesCost + totalVegetablesCost;'
  );
  
  // also render the summary box
  const oldBox = `          <div className="bg-[#fbfaf7] border border-[#e5e0d5] p-3 rounded-sm">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">Perishables Cost</span>
            <span className="font-mono-fig text-lg font-bold text-[#131715] block">
              {formatCurrency(totalPerishablesCost)}
            </span>
          </div>`;
  const newBox = oldBox + `
          <div className="bg-[#fbfaf7] border border-[#e5e0d5] p-3 rounded-sm">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">Vegetables Cost</span>
            <span className="font-mono-fig text-lg font-bold text-[#131715] block">
              {formatCurrency(totalVegetablesCost)}
            </span>
          </div>`;
  content = content.replace(oldBox, newBox);
  
  // grid cols
  content = content.replace('grid-cols-2 sm:grid-cols-4 gap-4 mb-6', 'grid-cols-2 sm:grid-cols-5 gap-4 mb-6');
  
  fs.writeFileSync('src/components/MonthlyReportView.tsx', content);
  console.log('done');
} else {
  console.log('not found');
}
