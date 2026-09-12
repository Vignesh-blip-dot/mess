const fs = require('fs');

for (const file of ['src/components/LogPurchaseView.tsx', 'src/components/LogUsageView.tsx']) {
  let content = fs.readFileSync(file, 'utf8');

  // Remove isSubmitting and setIsSubmitting from useApp()
  content = content.replace(/\s*isSubmitting,\s*setIsSubmitting,/, '');

  // Add them back as local state right after todayStr
  content = content.replace(/const todayStr = new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\];/, "const todayStr = new Date().toISOString().split('T')[0];\n  const [isSubmitting, setIsSubmitting] = useState(false);");

  fs.writeFileSync(file, content);
}
