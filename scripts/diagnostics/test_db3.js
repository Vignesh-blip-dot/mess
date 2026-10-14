import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);

async function check() {
  // Try to insert a stock transaction with anon key (no JWT). It should fail and maybe we can see the policy name in the error?
  // No, we can't see the policy name.
  // Can we fetch data from a table that might give us a clue?
  
  // Let's create a profile for a test user and login as them!
  const email = 'testuser' + Date.now() + '@example.com';
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  console.log("Signup:", authErr);
  if (authErr) return;

  const jwt = authData.session.access_token;
  const user_id = authData.user.id;
  
  const userClient = createClient(
    'https://dribchwasdoxumbvhoaf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY',
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  // Set role to 'incharge' by updating profiles. Wait, can I update my own role?
  // RLS probably blocks updating role.
  console.log("User ID:", user_id);
}
check();
