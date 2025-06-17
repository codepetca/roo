import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase.js'
import type { RequestEvent } from '@sveltejs/kit'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export async function getAuthenticatedUser(event: RequestEvent) {
  // Create client with anon key to verify session
  const supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  
  // Get session from request headers
  const authHeader = event.request.headers.get('authorization')
  if (!authHeader) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return null
    }
    return user
  } catch (error) {
    console.error('Auth verification failed:', error)
    return null
  }
}

export async function requireAuth(event: RequestEvent) {
  const user = await getAuthenticatedUser(event)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}