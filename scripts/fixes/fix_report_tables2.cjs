const fs = require('fs');
let content = fs.readFileSync('src/components/MonthlyReportView.tsx', 'utf8');

const perishablesSectionRegex = /<div className="bg-white border border-\[#e5e0d5\] rounded-sm p-4 sm:p-5 shadow-\[0_1px_3px_rgba\(19,23,21,0\.03\)\]">\s*<h3 className="font-serif text-lg font-bold text-\[#131715\] mb-3">\s*Perishables Consumption\s*<\/h3>.*?<\/table>\s*<\/div>\s*<\/div>\s*<\/div>/s;

const match = content.match(perishablesSectionRegex);
if (match) {
  const pSection = match[0];
  const vSection = pSection
    .replace('Perishables Consumption', 'Vegetables Consumption')
    .replace(/perishableRows/g, 'vegetableRows');
    
  content = content.replace(pSection, pSection + '\n\n      {/* Vegetables Section */}\n      ' + vSection);
  fs.writeFileSync('src/components/MonthlyReportView.tsx', content);
  console.log('done');
} else {
  console.log('not found');
}
