import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://jzbrxjzvrmvderqkmcei.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YnJ4anp2cm12ZGVycWttY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTY5NjAsImV4cCI6MjA5NjIzMjk2MH0.IRr33UkyvHuiA5SOxlI7AIkvOLzu3cUOVwe_J_b4mmM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
