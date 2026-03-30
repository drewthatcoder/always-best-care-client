import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://uwgfitnpesgdkiwtekcb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2ZpdG5wZXNnZGtpd3Rla2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDkxMTYsImV4cCI6MjA4OTYyNTExNn0.LDxFhHfaYGmFwsGqOfQoXrmFpKGb3J6ITOnMEh_1H3o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});