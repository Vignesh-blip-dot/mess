const fs = require('fs');

let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const newPurchaseImpl = `
  const logPurchaseBatch = async ({
    items,
    usageDate,
    vendor,
  }: {
    items: { ingredientId: string; quantity: number; totalCost: number }[];
    usageDate: string;
    vendor?: string;
  }) => {
    if (items.length === 0) return false;

    const newTxns: StockTransaction[] = [];
    const updatedIngsMap = new Map();
    const payloads: any[] = [];
    const auditLogsToAdd: any[] = [];
    
    let now = Date.now();

    for (const item of items) {
      const { ingredientId, quantity, totalCost } = item;
      const ing = ingredients.find((i) => i.ingredient_id === ingredientId) || updatedIngsMap.get(ingredientId);
      if (!ing) {
        showToast('Ingredient not found', true);
        return false;
      }

      // Weighted average cost update
      const currentStock = ing.current_stock;
      const currentVal = currentStock * ing.current_price;
      const addedStock = quantity;
      const addedVal = totalCost;
      const updatedStock = Math.round((currentStock + addedStock) * 100) / 100;
      const updatedPrice =
        updatedStock > 0
          ? Math.round(((currentVal + addedVal) / updatedStock) * 100) / 100
          : ing.current_price;

      updatedIngsMap.set(ingredientId, { ...ing, current_stock: updatedStock, current_price: updatedPrice });

      const newTxn: StockTransaction = {
        id: \`txn-\${now++}\`,
        ingredient_id: ingredientId,
        txn_type: 'purchase',
        quantity,
        total_cost: totalCost,
        usage_date: usageDate,
        vendor: vendor || null,
        meal_type: null,
        reason: null,
        created_at: new Date().toISOString(),
        created_by: profile?.id || 'usr-anon',
        created_by_name: profile?.name || 'Staff',
        ingredients: {
          name: ing.name,
          category: ing.category,
          unit: ing.unit,
        },
      };
      newTxns.push(newTxn);

      const txnPayload: any = {
        ingredient_id: ingredientId,
        txn_type: 'purchase',
        quantity,
        total_cost: totalCost,
        usage_date: usageDate,
        vendor: vendor || null,
      };
      if (isValidUuid(profile?.id)) {
        txnPayload.created_by = profile.id;
      }
      payloads.push(txnPayload);

      // Audit Log fallback prep
      auditLogsToAdd.push({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Staff',
        action: 'LOG_PURCHASE',
        entity_name: 'stock_transactions',
        reason: \`Purchased \${quantity} \${ing.unit} \${ing.name} for ₹\${totalCost.toLocaleString('en-IN')}\${vendor ? \` from \${vendor}\` : ''}\`,
      });
    }

    // Optimistic UI updates
    setIngredients((prev) =>
      prev.map((item) =>
        updatedIngsMap.has(item.ingredient_id)
          ? updatedIngsMap.get(item.ingredient_id)
          : item
      )
    );
    setTransactions((prev) => [...newTxns, ...prev]);

    // Send write directly to Supabase
    try {
      const client = getSupabase();
      
      const { error: txnErr } = await client.from('stock_transactions').insert(payloads); 
      if (txnErr) throw txnErr;

      // Update stock & unit price on ingredients table (safely handle schema variations)
      for (const item of items) {
         const { ingredientId } = item;
         const updated = updatedIngsMap.get(ingredientId);
         try {
           await client
             .from('ingredients')
             .update({ current_stock: updated.current_stock, current_price: updated.current_price })
             .eq('id', ingredientId);
         } catch {
           try {
             await client
               .from('ingredients')
               .update({ current_price: updated.current_price })
               .eq('id', ingredientId);
           } catch {}
         }
      }

      // Record Audit Logs
      for (const log of auditLogsToAdd) {
         await safeInsertAuditLog(log);
      }
      
      showToast('Purchases logged successfully.');
      return true;
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error recording purchases.', true);
      refreshDataFromSupabase();
      return false;
    }
  };
`;

const oldPurchaseRegex = /const logPurchase = async \({[\s\S]*?refreshDataFromSupabase\(\);\n\s*return false;\n\s*}\n\s*};\n/m;
content = content.replace(oldPurchaseRegex, newPurchaseImpl);

// Next: logUsageBatch
const newUsageImpl = `
  const logUsageBatch = async ({
    items,
    usageDate,
    mealType,
  }: {
    items: { ingredientId: string; quantity: number }[];
    usageDate: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | '';
  }) => {
    if (items.length === 0) return false;

    const newTxns: StockTransaction[] = [];
    const updatedIngsMap = new Map();
    const payloads: any[] = [];
    const auditLogsToAdd: any[] = [];
    
    let now = Date.now();
    let totalDeductionCost = 0;

    for (const item of items) {
      const { ingredientId, quantity } = item;
      const ing = ingredients.find((i) => i.ingredient_id === ingredientId) || updatedIngsMap.get(ingredientId);
      if (!ing) {
        showToast('Ingredient not found', true);
        return false;
      }

      const itemCost = Math.round(quantity * ing.current_price * 100) / 100;
      totalDeductionCost += itemCost;
      const newStock = Math.max(0, Math.round((ing.current_stock - quantity) * 100) / 100);

      updatedIngsMap.set(ingredientId, { ...ing, current_stock: newStock });
      
      const itemMeal = ing.category === 'perishable' ? null : (mealType || null);

      const newTxn: StockTransaction = {
        id: \`txn-\${now++}\`,
        ingredient_id: ingredientId,
        txn_type: 'usage',
        quantity: -quantity,
        total_cost: itemCost,
        usage_date: usageDate,
        vendor: null,
        meal_type: itemMeal,
        reason: null,
        created_at: new Date().toISOString(),
        created_by: profile?.id || 'usr-anon',
        created_by_name: profile?.name || 'Staff',
        ingredients: {
          name: ing.name,
          category: ing.category,
          unit: ing.unit,
        },
      };
      newTxns.push(newTxn);

      const txnPayload: any = {
        ingredient_id: ingredientId,
        txn_type: 'usage',
        quantity: -Math.abs(quantity),
        total_cost: itemCost,
        usage_date: usageDate,
        meal_type: itemMeal,
      };
      if (isValidUuid(profile?.id)) {
        txnPayload.created_by = profile.id;
      }
      payloads.push(txnPayload);

      auditLogsToAdd.push({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Staff',
        action: 'LOG_USAGE',
        entity_name: 'stock_transactions',
        reason: \`Deducted \${Math.abs(quantity)} \${ing.unit} \${ing.name} for \${itemMeal ? itemMeal.toUpperCase() : 'kitchen'} (₹\${itemCost.toLocaleString('en-IN')})\`,
      });
    }

    setIngredients((prev) =>
      prev.map((item) =>
        updatedIngsMap.has(item.ingredient_id)
          ? updatedIngsMap.get(item.ingredient_id)
          : item
      )
    );
    setTransactions((prev) => [...newTxns, ...prev]);

    try {
      const client = getSupabase();
      
      const { error: txnErr } = await client.from('stock_transactions').insert(payloads); 
      if (txnErr) throw txnErr;

      for (const item of items) {
         const { ingredientId } = item;
         const updated = updatedIngsMap.get(ingredientId);
         try {
           await client
             .from('ingredients')
             .update({ current_stock: updated.current_stock })
             .eq('id', ingredientId);
         } catch {}
      }

      await safeUpsertDailySummary(usageDate, totalDeductionCost);

      for (const log of auditLogsToAdd) {
         await safeInsertAuditLog(log);
      }
      
      showToast('Usages logged successfully.');
      return true;
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error recording usage.', true);
      refreshDataFromSupabase();
      return false;
    }
  };
`;

const oldUsageRegex = /const logUsage = async \({[\s\S]*?refreshDataFromSupabase\(\);\n\s*return false;\n\s*}\n\s*};\n/m;
content = content.replace(oldUsageRegex, newUsageImpl);

// Replace exports in AppContext return
content = content.replace('logPurchase,', 'logPurchaseBatch,');
content = content.replace('logUsage,', 'logUsageBatch,');

fs.writeFileSync('src/context/AppContext.tsx', content);
