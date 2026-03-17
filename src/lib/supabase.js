import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qsmegkrsbmpfzhzvgpxj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzbWVna3JzYm1wZnpoenZncHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDU0MjIsImV4cCI6MjA4OTIyMTQyMn0.dmqsDXFXGx8Yh8BJkgCFlRROpxiFgFQxpPtqqTEfk0I";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);