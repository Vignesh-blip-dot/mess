import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);

async function check() {
  const email = `testcoord${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({ email, password: 'password123' });
  
  if (data?.session) {
    const { error: insertErr } = await supabase.from('ingredients').insert({
      name: 'REQ-123',
      name_telugu: '{}',
      category: 'provisions',
      unit: 'req'
    });
    console.log('insert ingredients:', insertErr);
  }
}
check();
