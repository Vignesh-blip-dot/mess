import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);
async function run() {
  const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'coordinator');
  console.log("Coordinators:", profiles);
  if (profiles.length > 0) {
    const coordId = profiles[0].id;
    const { data: assignments } = await supabase.from('coordinator_assignments').select('*').eq('user_id', coordId);
    console.log("Assignments for coord:", assignments);
  }
}
run();
