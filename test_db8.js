import { createClient } from '@supabase/supabase-js';

const supabase = createClient( // this uses anon key
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);

// Can I read the function definition of `coordinator_access_level`?
async function run() {
  const { data, error } = await supabase.rpc('coordinator_access_level', { p_user_id: 'd900cfb5-5692-4f19-bd09-4dafe5255873' });
  console.log("Incharge access level:", data, error);
}
run();
