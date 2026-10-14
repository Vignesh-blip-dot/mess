import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);
async function run() {
  const { data: authData } = await supabase.auth.signUp({
    email: 'testlogs_' + Date.now() + '@example.com',
    password: 'password123'
  });
  
  const jwt = authData.session.access_token;
  const userClient = createClient(
    'https://dribchwasdoxumbvhoaf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY',
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  const { data } = await userClient.from('audit_log').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("audit_log:", data);
  const { data: data2 } = await userClient.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("audit_logs:", data2);
}
run();
