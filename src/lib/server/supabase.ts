import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase.js'
import { env } from '$env/dynamic/private'

let _supabase: ReturnType<typeof createClient<Database>> | null = null

export function getSupabase() {
  if (_supabase) return _supabase

  const supabaseUrl = env.SUPABASE_URL
  let supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

  // Fallback to anon key if service role key is invalid
  if (!supabaseKey) {
    console.warn('Using anon key as fallback for server operations')
    supabaseKey = env.VITE_SUPABASE_ANON_KEY
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`Missing SUPABASE environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseKey}`)
  }

  _supabase = createClient<Database>(supabaseUrl, supabaseKey)
  return _supabase
}

// For backwards compatibility
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop) {
    return getSupabase()[prop as keyof ReturnType<typeof createClient<Database>>]
  }
})