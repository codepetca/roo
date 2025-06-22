import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create dummy client or real client based on environment variables
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
    // Return a dummy client that will gracefully handle missing config
    return {
      from: () => ({
        select: () => ({ data: null, error: new Error('Supabase not configured') }),
        insert: () => ({ data: null, error: new Error('Supabase not configured') }),
        update: () => ({ data: null, error: new Error('Supabase not configured') }),
        delete: () => ({ data: null, error: new Error('Supabase not configured') })
      }),
      auth: {
        getUser: () => ({ data: { user: null }, error: new Error('Supabase not configured') })
      }
    } as any
  } else {
    return createClient<Database>(supabaseUrl, supabaseKey)
  }
}

export const supabase = createSupabaseClient()