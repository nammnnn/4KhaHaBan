import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] ไม่พบค่า Environment Variables กรุณาตรวจสอบไฟล์ .env\n' +
    'VITE_SUPABASE_URL:', supabaseUrl ? 'พบแล้ว' : 'ไม่พบ', '\n' +
    'VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'พบแล้ว' : 'ไม่พบ'
  );
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase] เชื่อมต่อสำเร็จ');
  } catch (error) {
    console.error('[Supabase] เชื่อมต่อไม่สำเร็จ:', error.message);
  }
}

export { supabase };
