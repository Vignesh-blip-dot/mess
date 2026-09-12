import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);
async function run() {
  const txnPayload = {
    ingredient_id: '5f199b75-337f-44e4-9ca3-c94221a0914e',
    txn_type: 'purchase',
    quantity: 2,
    total_cost: 40,
    usage_date: new Date().toISOString(),
    created_by: '7d3d3344-ce44-4cab-8ee2-cedb68dbda70' // Coordinator UUID from earlier
  };
  const { error } = await supabase.from('stock_transactions').insert(txnPayload);
  console.log("Insert result:", error);
}
run();
