import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create dummy client or real client based on environment variables
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
    // Return a dummy client that will gracefully handle missing config
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
        getUser: () => ({ data: { user: null }, error: new Error('Supabase not configured - demo mode') })
      }
    } as any
  } else {
    return createClient<Database>(supabaseUrl, supabaseKey)
  }
}

export const supabase = createSupabaseClient()