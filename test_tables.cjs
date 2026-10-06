const fs = require('fs');
let content = fs.readFileSync('src/components/MonthlyReportView.tsx', 'utf8');
const tables = content.match(/<table.*?<\/table>/gs);
if(tables) console.log(tables.length);
