import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);

async function check() {
  const email = `testcoord${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  console.log('signUp:', error ? error.message : 'success');
  
  if (data?.session) {
    const { error: insertErr } = await supabase.from('audit_log').insert({
      action: 'ADJUSTMENT_REQUEST',
      entity_name: 'stock_transactions',
      reason: '{}'
    });
    console.log('insert audit_log:', insertErr);
  }
}
check();
