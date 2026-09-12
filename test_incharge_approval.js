import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);

async function test() {
  // First, get an incharge profile
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').eq('role', 'incharge').limit(1);
  if (pErr || !profiles.length) {
    console.log("No incharge found", pErr);
    return;
  }
  const incharge = profiles[0];
  console.log("Incharge:", incharge.name, incharge.email);
  // Wait, I can't authenticate as the incharge because I don't know their password.
}
test();
