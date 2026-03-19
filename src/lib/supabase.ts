import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dqabtxjtiwrnuplupiuf.supabase.co";
const supabaseAnonKey = "sb_publishable_aUYRDXKwBOjHDdfispf3UQ_y26oTsWI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);