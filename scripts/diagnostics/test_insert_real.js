import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);

async function check() {
  const payload = {
    action: 'ADJUSTMENT_REQUEST',
    entity_name: 'stock_transactions',
    reason: JSON.stringify({ reqId: 'test1234' })
  };
  
  const { error } = await supabase.from('audit_logs').insert(payload);
  console.log('audit_logs error:', error);
  
  if (error) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.user_name;
    const { error: e2 } = await supabase.from('audit_log').insert(fallbackPayload);
    console.log('audit_log fallback error:', e2);
  }
}
check();
