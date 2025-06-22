import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/supabase.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug logging
console.log('Debug - Environment variables:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined',
  keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined',
  allEnvVars: Object.keys(import.meta.env),
  fullEnvVars: import.meta.env
})

// Create dummy client or real client based on environment variables
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
    console.error('Current values:', { supabaseUrl, supabaseAnonKey })
    // Return a dummy client for development/staging without credentials
    const createChainableQuery = () => {
      const queryBuilder = {
        select: () => queryBuilder,
        insert: () => queryBuilder,
        update: () => queryBuilder,
        delete: () => queryBuilder,
        eq: () => queryBuilder,
        neq: () => queryBuilder,
        gt: () => queryBuilder,
        gte: () => queryBuilder,
        lt: () => queryBuilder,
        lte: () => queryBuilder,
        like: () => queryBuilder,
        ilike: () => queryBuilder,
        is: () => queryBuilder,
        in: () => queryBuilder,
        contains: () => queryBuilder,
        containedBy: () => queryBuilder,
        rangeGt: () => queryBuilder,
        rangeGte: () => queryBuilder,
        rangeLt: () => queryBuilder,
        rangeLte: () => queryBuilder,
        rangeAdjacent: () => queryBuilder,
        overlaps: () => queryBuilder,
        textSearch: () => queryBuilder,
        match: () => queryBuilder,
        not: () => queryBuilder,
        filter: () => queryBuilder,
        or: () => queryBuilder,
        order: () => queryBuilder,
        limit: () => queryBuilder,
        range: () => queryBuilder,
        single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured - demo mode') }),
        maybeSingle: () => Promise.resolve({ data: null, error: new Error('Supabase not configured - demo mode') }),
        then: (resolve: any) => Promise.resolve({ data: [], error: new Error('Supabase not configured - demo mode') }).then(resolve),
        catch: (reject: any) => Promise.resolve({ data: [], error: new Error('Supabase not configured - demo mode') }).catch(reject)
      }
      return queryBuilder
    }

    return {
      from: () => createChainableQuery(),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: new Error('Supabase not configured - demo mode') }),
        signUp: () => Promise.resolve({ data: { user: null, session: null }, error: new Error('Supabase not configured - demo mode') }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: null }, error: null })
      },
      channel: () => ({
        on: () => ({ subscribe: () => ({}) }),
        subscribe: () => ({})
      })
    } as any
  } else {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'supabase.auth.token',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
}

export const supabase = createSupabaseClient()