import { supabase } from '$lib/supabase.js'
import type { User } from '@supabase/supabase-js'
import type { UserProfile, UserRole } from '$lib/types/index.js'

class AuthStore {
  user = $state<User | null>(null)
  profile = $state<UserProfile | null>(null)
  loading = $state(true)
  initialized = $state(false)

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeAuth()
    }
  }

  private async initializeAuth() {
    // Set up auth state change listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)

      this.loading = true
      this.user = session?.user ?? null

      if (session?.user) {
        console.log('User session found, creating temporary profile...')
        // Skip database query for now and create a temporary profile
        const tempProfile: UserProfile = {
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email || 'User',
          role: session.user.user_metadata?.role || 'teacher', // Default to teacher for now
          created_at: session.user.created_at || new Date().toISOString(),
        }
        
        this.profile = tempProfile
        console.log('Temporary profile created:', tempProfile)
      } else {
        this.profile = null
        console.log('No session, cleared profile')
      }

      this.loading = false
      this.initialized = true
      console.log('Auth loading complete')
    })

    // Get initial session
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      this.user = session.user
      try {
        await this.loadProfile(session.user.id)
      } catch (error) {
        console.error('Failed to load initial profile:', error)
        await this.handleProfileCreation(session.user)
      }
    }
    
    this.loading = false
    this.initialized = true
  }

  private async handleProfileCreation(user: User) {
    // If profile doesn't exist, try to create it from user metadata
    if (user.user_metadata?.full_name && user.user_metadata?.role) {
      try {
        const { error: createError } = await supabase.from('profiles').insert({
          id: user.id,
          full_name: user.user_metadata.full_name,
          role: user.user_metadata.role,
        })

        if (!createError) {
          // Profile created successfully, load it
          await this.loadProfile(user.id)
          console.log('Profile created and loaded from metadata')
        } else {
          console.error('Manual profile creation failed:', createError)
          this.setFallbackProfile(user)
        }
      } catch (createError) {
        console.error('Profile creation attempt failed:', createError)
        this.setFallbackProfile(user)
      }
    } else {
      // No metadata available, set a basic profile
      const basicFallbackProfile: UserProfile = {
        id: user.id,
        full_name: 'User',
        role: 'teacher' as UserRole,
        created_at: user.created_at || new Date().toISOString(),
      }
      this.profile = basicFallbackProfile
      console.log('Set basic fallback profile')
    }
  }

  private setFallbackProfile(user: User) {
    const fallbackProfile: UserProfile = {
      id: user.id,
      full_name: user.user_metadata.full_name,
      role: user.user_metadata.role as UserRole,
      created_at: user.created_at || new Date().toISOString(),
    }
    this.profile = fallbackProfile
    console.log('Set fallback profile from metadata')
  }

  async loadProfile(userId: string): Promise<UserProfile> {
    console.log('Loading profile for user:', userId)
    
    // Try direct query with retries (avoid getSession which seems to hang)
    let retries = 0
    const maxRetries = 5
    
    while (retries < maxRetries) {
      console.log(`Profile query attempt ${retries + 1}/${maxRetries}`)
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        console.log('Profile query result:', { data, error })

        if (error) {
          console.error('Profile load error:', error)
          // If it's an auth error, retry
          if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
            console.log('Auth error, retrying...')
            retries++
            if (retries >= maxRetries) {
              throw error
            }
            await new Promise(resolve => setTimeout(resolve, 500))
            continue
          }
          throw error
        }

        // Success!
        const userProfileData: UserProfile = {
          ...data,
          role: data.role as UserRole,
          created_at: data.created_at ?? new Date().toISOString(),
        }
        
        console.log('Setting profile to:', userProfileData)
        this.profile = userProfileData
        return userProfileData
        
      } catch (queryError) {
        console.error(`Profile query failed on attempt ${retries + 1}:`, queryError)
        retries++
        if (retries >= maxRetries) {
          throw queryError
        }
        console.log(`Retrying in 500ms... (${retries}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    throw new Error('Failed to load profile after maximum retries')
  }

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async signUpWithEmail(
    email: string,
    password: string,
    fullName: string,
    role: 'teacher' | 'student'
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    })
    if (error) throw error

    // Profile will be automatically created by database trigger
    // No need to manually create it
    return data
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // Clear stores
      this.user = null
      this.profile = null
      this.loading = false

      // Force page reload to clear any cached state
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      // Force reload anyway to clear state
      window.location.href = '/'
    }
  }

  // Computed values
  get isAuthenticated() {
    return this.user !== null
  }

  get isTeacher() {
    return this.profile?.role === 'teacher'
  }

  get isStudent() {
    return this.profile?.role === 'student'
  }

  get displayName() {
    return this.profile?.full_name || this.user?.email || 'User'
  }
}

// Export singleton instance
export const authStore = new AuthStore()

// Export for backwards compatibility
export const { user, profile, loading } = authStore
export const { signInWithEmail, signUpWithEmail, signOut, loadProfile } = authStore