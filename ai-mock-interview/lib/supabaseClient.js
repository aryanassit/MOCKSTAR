// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("My URL is:", supabaseUrl);
console.log("My Key is:", supabaseKey ? "Key Exists!" : "Key is MISSING!");

export const supabase = createClient(supabaseUrl, supabaseKey);