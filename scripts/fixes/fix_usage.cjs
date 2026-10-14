const fs = require('fs');

let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const logUsageStart = content.indexOf('  // 2. Log Meal Usage\n  const logUsage = async ({');
let logUsageEnd = content.indexOf('  // 3. Stock Adjustment', logUsageStart);

const newUsageImpl = `  // 2. Log Meal Usage
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
        quantity: -Math.abs(quantity),
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

content = content.substring(0, logUsageStart) + newUsageImpl + content.substring(logUsageEnd);

fs.writeFileSync('src/context/AppContext.tsx', content);
