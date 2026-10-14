const fs = require('fs');

let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const logPurchaseStart = content.indexOf('  const logPurchase = async ({');
let logPurchaseEnd = content.indexOf('  // 2. Log Meal Usage', logPurchaseStart);

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

content = content.substring(0, logPurchaseStart) + newPurchaseImpl + content.substring(logPurchaseEnd);

fs.writeFileSync('src/context/AppContext.tsx', content);
