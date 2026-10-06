const fs = require('fs');
let content = fs.readFileSync('src/components/MonthlyReportView.tsx', 'utf8');

const oldGroups = `  let provisionsTotal = 0;
  let perishableTotal = 0;

  for (const line of Object.values(lineItems)) {
    if (line.category === 'provisions') {
      provisionsTotal += line.cost;
    } else {
      perishableTotal += line.cost;
    }
  }`;
  
const newGroups = `  let provisionsTotal = 0;
  let perishableTotal = 0;
  let vegetableTotal = 0;

  for (const line of Object.values(lineItems)) {
    if (line.category === 'provisions') {
      provisionsTotal += line.cost;
    } else if (line.category === 'vegetable') {
      vegetableTotal += line.cost;
    } else {
      perishableTotal += line.cost;
    }
  }`;

content = content.replace(oldGroups, newGroups);

const oldJsx = `              <div className="bg-[#f5f2eb] rounded-sm p-4 border border-[#e5e0d5]">
                <div className="text-xs text-[#59635e] font-medium mb-1">Total Provisions</div>
                <div className="font-mono-fig text-xl font-bold text-[#131715]">{formatCurrency(provisionsTotal)}</div>
              </div>
              <div className="bg-[#f5f2eb] rounded-sm p-4 border border-[#e5e0d5]">
                <div className="text-xs text-[#59635e] font-medium mb-1">Total Perishables</div>
                <div className="font-mono-fig text-xl font-bold text-[#131715]">{formatCurrency(perishableTotal)}</div>
              </div>`;
              
const newJsx = `              <div className="bg-[#f5f2eb] rounded-sm p-4 border border-[#e5e0d5]">
                <div className="text-xs text-[#59635e] font-medium mb-1">Total Provisions</div>
                <div className="font-mono-fig text-xl font-bold text-[#131715]">{formatCurrency(provisionsTotal)}</div>
              </div>
              <div className="bg-[#f5f2eb] rounded-sm p-4 border border-[#e5e0d5]">
                <div className="text-xs text-[#59635e] font-medium mb-1">Total Perishables</div>
                <div className="font-mono-fig text-xl font-bold text-[#131715]">{formatCurrency(perishableTotal)}</div>
              </div>
              <div className="bg-[#f5f2eb] rounded-sm p-4 border border-[#e5e0d5]">
                <div className="text-xs text-[#59635e] font-medium mb-1">Total Vegetables</div>
                <div className="font-mono-fig text-xl font-bold text-[#131715]">{formatCurrency(vegetableTotal)}</div>
              </div>`;

content = content.replace(oldJsx, newJsx);
content = content.replace('grid-cols-2 sm:grid-cols-4 gap-3', 'grid-cols-2 sm:grid-cols-5 gap-3');

fs.writeFileSync('src/components/MonthlyReportView.tsx', content);
