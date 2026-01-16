import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client that doesn't do anything during build
    // This allows the app to build without Supabase credentials
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signUp: async () => ({ data: { user: null }, error: { message: 'Supabase not configured' } }),
        signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Supabase not configured' } }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            order: () => ({ data: [], error: null })
          }),
          order: () => ({ data: [], error: null })
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: 'Supabase not configured' } })
          })
        }),
        update: () => ({
          eq: async () => ({ data: null, error: null })
        }),
        upsert: async () => ({ data: null, error: null }),
        delete: () => ({
          eq: async () => ({ data: null, error: null })
        })
      })
    } as unknown as ReturnType<typeof createBrowserClient<Database>>
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
