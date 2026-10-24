import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dribchwasdoxumbvhoaf.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrate() {
  console.log('Fetching stock_transactions with 2024 usage_date...');

  const { data: txns, error: fetchErr } = await supabase
    .from('stock_transactions')
    .select('id, usage_date, quantity, total_cost, txn_type')
    .eq('txn_type', 'usage')
    .gte('usage_date', '2024-01-01')
    .lte('usage_date', '2024-12-31');

  if (fetchErr) {
    console.error('Error fetching transactions:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${txns.length} usage transactions from 2024.`);
  if (txns.length === 0) {
    console.log('No 2024 transactions to migrate.');
    return;
  }

  // Group by date to show progress
  const dateMap = {};
  txns.forEach((t) => {
    dateMap[t.usage_date] = (dateMap[t.usage_date] || 0) + 1;
  });
  console.log('Breakdown by date:', dateMap);

  let updatedCount = 0;
  for (const oldDate of Object.keys(dateMap)) {
    const newDate = oldDate.replace(/^2024-/, '2026-');
    console.log(`Migrating ${dateMap[oldDate]} records from ${oldDate} -> ${newDate}...`);

    const { data, error } = await supabase
      .from('stock_transactions')
      .update({ usage_date: newDate })
      .eq('txn_type', 'usage')
      .eq('usage_date', oldDate);

    if (error) {
      console.error(`Failed to update ${oldDate}:`, error);
    } else {
      updatedCount += dateMap[oldDate];
    }
  }

  console.log(`Successfully updated ${updatedCount} transactions.`);

  // Verification step
  console.log('\n--- VERIFICATION ---');
  const { data: remaining2024 } = await supabase
    .from('stock_transactions')
    .select('id')
    .eq('txn_type', 'usage')
    .gte('usage_date', '2024-01-01')
    .lte('usage_date', '2024-12-31');

  console.log('Remaining 2024 usage transactions:', remaining2024?.length ?? 0);

  const { data: updated2026 } = await supabase
    .from('daily_expenditure_summary')
    .select('usage_date, total_expenditure')
    .gte('usage_date', '2026-10-01')
    .lte('usage_date', '2026-10-31')
    .order('usage_date', { ascending: true });

  console.log('Updated October 2026 Daily Expenditure Summaries:');
  console.table(updated2026);
}

migrate().catch(console.error);
