const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSectors() {
  const { data, error } = await supabase.from('sectors').select('name').order('name');
  if (error) {
    console.error("Error fetching sectors:", error);
    return;
  }
  console.log("Current Sectors in DB:");
  data.forEach(s => console.log(`- ${s.name}`));
}

checkSectors();
