const fs = require('fs');
let content = fs.readFileSync('src/components/MonthlyReportView.tsx', 'utf8');

const perishablesSectionMatch = content.match(/<h3 className="font-serif text-lg font-bold text-\[#131715\] mb-3">.*?Perishables Consumption.*?<\/div>.*?<\/div>.*?<\/div>/s);
if (perishablesSectionMatch) {
  const perishablesSection = perishablesSectionMatch[0];
  const vegetableSection = perishablesSection
    .replace(/Perishables Consumption/g, 'Vegetables Consumption')
    .replace(/perishableRows/g, 'vegetableRows');
  
  content = content.replace(perishablesSection, perishablesSection + '\n\n      {/* Vegetables Section */}\n      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">\n' + vegetableSection.replace('<div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">', ''));
  fs.writeFileSync('src/components/MonthlyReportView.tsx', content);
  console.log('updated tables');
} else {
  console.log('did not match perishables section');
}
