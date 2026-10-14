import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.example', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
