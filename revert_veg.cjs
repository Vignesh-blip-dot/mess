const fs = require('fs');

function revertAddIngredient() {
  const path = 'src/components/AddIngredientView.tsx';
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/<option value="vegetable">Vegetables<\/option>\s*/, '');
  fs.writeFileSync(path, content);
}

function revertDashboard() {
  const path = 'src/components/DashboardView.tsx';
  let content = fs.readFileSync(path, 'utf8');
  
  // Remove vegetablesValue calculation
  content = content.replace(/const vegetablesValue = ingredients[\s\S]*?\.reduce\(\(sum, i\) => sum \+ i\.currentStock \* i\.currentPrice, 0\);/, '');
  
  // Remove Vegetables Value in Stock card
  content = content.replace(/<div className="bg-white rounded-xl p-5 border border-[#e2e8e0] shadow-sm flex flex-col justify-between relative overflow-hidden">[\s\S]*?Vegetables Value in Stock[\s\S]*?\{formatCurrency\(vegetablesValue\)\}[\s\S]*?Fresh vegetables and greens[\s\S]*?<\/div>/, '');

  fs.writeFileSync(path, content);
}

function revertIngredientsView() {
  const path = 'src/components/IngredientsView.tsx';
  let content = fs.readFileSync(path, 'utf8');
  
  content = content.replace(/\| 'vegetable'/, '');
  content = content.replace(/if \(activeTab === 'vegetable' && item\.category !== 'vegetable'\) return false;/, '');
  content = content.replace(/const vegetablesCount = ingredients\.filter\(\(i\) => i\.category === 'vegetable'\)\.length;/, '');
  
  // Remove Vegetable tab
  content = content.replace(/<button\s+onClick=\{\(\) => setActiveTab\('vegetable'\)\}[\s\S]*?Vegetables \(\{vegetablesCount\}\)\s+<\/button>/, '');
  
  // Remove vegetable class check
  content = content.replace(/: item\.category === 'vegetable' \? 'bg-\[#e6f0ea\] text-\[#193d2c\] border border-\[#193d2c\]\/20' /, '');

  fs.writeFileSync(path, content);
}

function revertNavigation() {
  const path = 'src/components/Navigation.tsx';
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/\{ id: 'vegetable-inventory'[\s\S]*?\},?\s*/g, '');
  content = content.replace(/'vegetable-inventory'\s*\|\s*/g, '');
  content = content.replace(/Provisions & Perishables/, 'Ingredients & Stock');
  fs.writeFileSync(path, content);
}

function revertTypes() {
  const path = 'src/types.ts';
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/\| 'vegetable'/, '');
  content = content.replace(/\|\s*'vegetable-inventory'/g, '');
  content = content.replace(/\|\s*'log-veg-purchase'/g, '');
  content = content.replace(/\|\s*'log-veg-usage'/g, '');
  fs.writeFileSync(path, content);
}

function revertAppContext() {
  const path = 'src/context/AppContext.tsx';
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/\|\| ing\.category === 'vegetable'/g, '');
  fs.writeFileSync(path, content);
}

function revertMonthlyReport() {
  const path = 'src/components/MonthlyReportView.tsx';
  let content = fs.readFileSync(path, 'utf8');
  
  content = content.replace(/const vegetableRows: IngredientMonthLine\[\] = \[\];\s*/, '');
  content = content.replace(/\} else if \(line\.category === 'vegetable'\) \{\s*vegetableRows\.push\(line\);\s*/, '');
  content = content.replace(/const totalVegetablesCost = vegetableRows\.reduce\(\(s, r\) => s \+ r\.usedCost, 0\);\s*/, '');
  content = content.replace(/\+ totalVegetablesCost/, '');
  
  // Remove Vegetables summary box
  content = content.replace(/<div className="bg-[#f7f9f7] rounded-lg p-3 border border-[#e2e8e0]">[\s\S]*?Vegetables Cost[\s\S]*?\{formatCurrency\(totalVegetablesCost\)\}[\s\S]*?<\/div>/, '');

  // Remove vegetable detailed table
  content = content.replace(/\{\/\* Vegetables Ingredient Detail Table \*\/\}[\s\S]*?(?=<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*$)/, '');

  fs.writeFileSync(path, content);
}

try { revertAddIngredient(); } catch (e) { console.error('AddIngredient', e); }
try { revertDashboard(); } catch (e) { console.error('Dashboard', e); }
try { revertIngredientsView(); } catch (e) { console.error('IngredientsView', e); }
try { revertNavigation(); } catch (e) { console.error('Navigation', e); }
try { revertTypes(); } catch (e) { console.error('Types', e); }
try { revertAppContext(); } catch (e) { console.error('AppContext', e); }
try { revertMonthlyReport(); } catch (e) { console.error('MonthlyReport', e); }

