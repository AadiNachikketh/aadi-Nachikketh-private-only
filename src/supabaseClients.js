import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://oiagekzaqhivwsgrfspy.supabase.co/rest/v1/";
const SUPABASE_PUBLIC_KEY = "sb_publishable_1opOc3uz7maUmHinD8gf9g_QiFr88pd";

// Normalize base project URL in case /rest/v1/ is included in SUPABASE_URL
const normalizedSupabaseUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '');

export const supabase = createClient(normalizedSupabaseUrl, SUPABASE_PUBLIC_KEY);

export { SUPABASE_URL, SUPABASE_PUBLIC_KEY };
export default supabase;
