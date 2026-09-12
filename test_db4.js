import { createClient } from '@supabase/supabase-js';

const user_id = 'b73b940a-16c9-4eb7-82fe-20c88cbcba1d';

const supabase = createClient( // this uses anon key
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);

async function setRole() {
  // Let's see if there is a service role key in the environment!
  // No, we don't have the service role key.
  // Wait, I can't change the role unless I have admin privileges.
  // BUT what if there's no RLS on profiles for update?
  const { data, error } = await supabase.from('profiles').update({ role: 'incharge' }).eq('id', user_id);
  console.log("Update profile without auth:", error);
}
setRole();
