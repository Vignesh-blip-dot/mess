const fs = require('fs');

let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

// Replace logPurchase interface
content = content.replace(
  /logPurchase: \(data: {[\s\S]*?}\) => Promise<boolean>;/,
  `logPurchaseBatch: (data: { items: { ingredientId: string; quantity: number; totalCost: number }[]; usageDate: string; vendor?: string }) => Promise<boolean>;`
);

// Replace logUsage interface
content = content.replace(
  /logUsage: \(data: {[\s\S]*?}\) => Promise<boolean>;/,
  `logUsageBatch: (data: { items: { ingredientId: string; quantity: number }[]; usageDate: string; mealType?: 'breakfast' | 'lunch' | 'dinner' | '' }) => Promise<boolean>;`
);

fs.writeFileSync('src/context/AppContext.tsx', content);
