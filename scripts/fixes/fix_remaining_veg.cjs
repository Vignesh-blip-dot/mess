const fs = require('fs');

function fixDashboard() {
  const path = 'src/components/DashboardView.tsx';
  let content = fs.readFileSync(path, 'utf8');
  
  // Remove vegetablesValue calculation entirely
  content = content.replace(/const vegetablesValue = ingredients[\s\S]*?\.reduce\(\(sum, i\) => sum \+ i\.currentStock \* i\.currentPrice, 0\);\s*/, '');
  
  // Remove Vegetables Value in Stock card
  content = content.replace(/<div className="bg-white rounded-xl p-5 border border-\[#e2e8e0\] shadow-sm flex flex-col justify-between relative overflow-hidden">\s*<div className="flex items-start justify-between mb-2">\s*<div>\s*<span className="text-xs text-\[#59635e\] font-medium">Vegetables Value in Stock<\/span>\s*<\/div>\s*<\/div>\s*<div>\s*<div className="text-2xl font-semibold text-\[#193d2c\] tracking-tight">\s*\{formatCurrency\(vegetablesValue\)\}\s*<\/div>\s*<\/div>\s*<div className="mt-4 pt-4 border-t border-\[#e2e8e0\]">\s*<div className="text-\[11px\] text-\[#59635e\] leading-relaxed">\s*Fresh vegetables and greens\s*<\/div>\s*<\/div>\s*<\/div>/, '');

  fs.writeFileSync(path, content);
}

function fixMonthlyReport() {
  const path = 'src/components/MonthlyReportView.tsx';
  let content = fs.readFileSync(path, 'utf8');

  // Find the exact block for the vegetables cost div and remove it
  content = content.replace(/<div className="bg-\[#f7f9f7\] rounded-lg p-3 border border-\[#e2e8e0\]">\s*<span className="text-\[11px\] text-\[#59635e\] block font-medium mb-1">Vegetables Cost<\/span>\s*<span className="text-sm font-semibold text-\[#193d2c\]">\s*\{formatCurrency\(totalVegetablesCost\)\}\s*<\/span>\s*<\/div>\s*/, '');

  // Remove the vegetables table
  const tableRegex = /\{\/\* Vegetables Ingredient Detail Table \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*(?=\{\/\* END OF NEW DETAILED INGREDIENT TABLES \*\/\}|<\/div>\s*$)/;
  content = content.replace(tableRegex, '');
  
  fs.writeFileSync(path, content);
}

try { fixDashboard(); } catch (e) { console.error('Dashboard', e); }
try { fixMonthlyReport(); } catch (e) { console.error('MonthlyReport', e); }
