import { writable } from 'svelte/store'
import { supabase } from '$lib/supabase.js'
import type { User } from '@supabase/supabase-js'
import type { UserProfile, UserRole } from '$lib/types/index.js' // Added UserProfile and UserRole

export const user = writable<User | null>(null)
export const profile = writable<UserProfile | null>(null) // Updated type from any to UserProfile | null
export const loading = writable(true)

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signUpWithEmail(email: string, password: string, fullName: string, role: 'teacher' | 'student') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role
      }
    }
  })
  if (error) throw error
  
  // Profile will be automatically created by database trigger
  // No need to manually create it
  
  return data
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // Clear stores
    user.set(null)
    profile.set(null)
    loading.set(false)
    
    // Force page reload to clear any cached state
    window.location.href = '/'
  } catch (error) {
    console.error('Sign out error:', error)
    // Force reload anyway to clear state
    window.location.href = '/'
  }
}

export async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  // Ensure data conforms to UserProfile, especially the role
  const userProfileData: UserProfile = {
    ...data,
    role: data.role as UserRole // Cast role to UserRole
  };
  profile.set(userProfileData)
  return userProfileData // Return the typed profile
}

// Initialize auth state
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event, session?.user?.id)
  
  loading.set(true)
  user.set(session?.user ?? null)
  
  if (session?.user) {
    try {
      await loadProfile(session.user.id)
      console.log('Profile loaded successfully')
    } catch (error) {
      console.error('Failed to load profile:', error)
      
      // If profile doesn't exist, try to create it from user metadata
      if (session.user.user_metadata?.full_name && session.user.user_metadata?.role) {
        try {
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              full_name: session.user.user_metadata.full_name,
              role: session.user.user_metadata.role
            })
          
          if (!createError) {
            // Profile created successfully, load it
            await loadProfile(session.user.id)
            console.log('Profile created and loaded from metadata')
          } else {
            console.error('Manual profile creation failed:', createError)
            // Set a fallback profile from metadata
            const fallbackProfile: UserProfile = {
              id: session.user.id,
              full_name: session.user.user_metadata.full_name,
              role: session.user.user_metadata.role as UserRole, // Cast role
              created_at: session.user.created_at || new Date().toISOString() // Use user created_at if available
            };
            profile.set(fallbackProfile)
            console.log('Set fallback profile from metadata')
          }
        } catch (createError) {
          console.error('Profile creation attempt failed:', createError)
          // Set fallback profile from metadata
          const fallbackProfileCatch: UserProfile = {
            id: session.user.id,
            full_name: session.user.user_metadata.full_name,
            role: session.user.user_metadata.role as UserRole, // Cast role
            created_at: session.user.created_at || new Date().toISOString()
          };
          profile.set(fallbackProfileCatch)
          console.log('Set fallback profile from metadata (catch)')
        }
      } else {
        // No metadata available, set a basic profile
        const basicFallbackProfile: UserProfile = {
          id: session.user.id,
          full_name: 'User',
          role: 'teacher' as UserRole, // Default to teacher, cast role
          created_at: session.user.created_at || new Date().toISOString()
        };
        profile.set(basicFallbackProfile)
        console.log('Set basic fallback profile')
      }
    }
  } else {
    profile.set(null)
    console.log('No session, cleared profile')
  }
  
  loading.set(false)
  console.log('Auth loading complete')
})