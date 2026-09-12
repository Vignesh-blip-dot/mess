import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);

async function check() {
  const { data: aud1, error: aErr1 } = await supabase
    .from('audit_logs')
    .select('*, profiles(name)')
    .order('created_at', { ascending: false })
    .limit(100);

  console.log('aud1:', aud1 ? aud1.length : 'null', aErr1);

  const { data: aud2, error: aErr2 } = await supabase
    .from('audit_log')
    .select('*, profiles(name)')
    .order('created_at', { ascending: false })
    .limit(100);
    
  console.log('aud2:', aud2 ? aud2.length : 'null', aErr2);
  
  if (aud2) {
    console.log('Latest aud2 item:', aud2[0]);
  }
}
check();
