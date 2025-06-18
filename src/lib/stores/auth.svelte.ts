import { supabase } from '$lib/supabase.js'
import type { User } from '@supabase/supabase-js'
import type { UserProfile, UserRole } from '$lib/types/index.js'

class AuthStore {
  user = $state<User | null>(null)
  profile = $state<UserProfile | null>(null)
  loading = $state(true)
  initialized = $state(false)
  error = $state<string | null>(null)

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeAuth()
    }
  }

  private async initializeAuth() {
    console.log('Initializing auth system...')
    
    // Set up auth state change listener (fast, non-blocking)
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      this.error = null
      this.user = session?.user ?? null

      if (session?.user) {
        // Fast profile creation, no blocking
        this.handleUserSession(session.user)
      } else {
        this.profile = null
        console.log('No session, cleared profile')
      }

      console.log('Auth state change processed')
    })

    // Fast initial session check
    try {
      console.log('Getting initial session...')
      const { data: { session } } = await this.withTimeout(
        supabase.auth.getSession(),
        1000 // Much shorter timeout
      )
      
      if (session?.user) {
        console.log('Initial session found:', session.user.id)
        this.user = session.user
        this.handleUserSession(session.user)
      } else {
        console.log('No initial session')
      }
    } catch (error) {
      console.log('Session check failed, but continuing:', error)
      // Don't set error - just continue without blocking
    }
    
    // Always complete initialization quickly
    this.loading = false
    this.initialized = true
    console.log('Auth initialization complete')
  }

  private async handleUserSession(user: User) {
    console.log('Handling user session for:', user.id)
    
    // FAST PATH: Create fallback profile immediately
    this.createFallbackProfile(user)
    
    // BACKGROUND: Try to load real profile, but don't block UI
    this.loadProfileInBackground(user.id)
  }

  private async loadProfileInBackground(userId: string) {
    try {
      console.log('Loading profile in background for:', userId)
      const result = await this.withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).single(),
        2000 // Shorter timeout for background load
      )
      const { data, error } = result

      if (!error && data) {
        const userProfileData: UserProfile = {
          ...data,
          role: data.role as UserRole,
          created_at: data.created_at ?? new Date().toISOString(),
        }
        
        console.log('Background profile loaded:', userProfileData)
        this.profile = userProfileData
      }
    } catch (error) {
      console.log('Background profile load failed (using fallback):', error)
      // Fallback is already set, no need to do anything
    }
  }

  private createFallbackProfile(user: User) {
    console.log('Creating fallback profile with user metadata:', user.user_metadata)
    const fallbackProfile: UserProfile = {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      role: (user.user_metadata?.role as UserRole) || 'student',
      created_at: user.created_at || new Date().toISOString(),
    }
    
    this.profile = fallbackProfile
    console.log('Created fallback profile:', fallbackProfile)
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ])
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
    // For teacher signups, set role to 'teacher_pending' to require approval
    const actualRole = role === 'teacher' ? 'teacher_pending' : role
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: actualRole,
        },
        emailRedirectTo: `${window.location.origin}/auth/verify-email`,
      },
    })
    if (error) throw error

    // If email confirmation is required, user won't be logged in immediately
    // Profile will be automatically created by database trigger after verification
    return data
  }

  async signOut() {
    console.log('Signing out...')
    this.loading = true
    
    try {
      const { error } = await this.withTimeout(supabase.auth.signOut(), 5000)
      if (error) throw error

      // Clear stores
      this.user = null
      this.profile = null
      this.error = null
      this.loading = false

      console.log('Sign out successful')
      // Force page reload to clear any cached state
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      // Force reload anyway to clear state
      this.user = null
      this.profile = null
      this.error = null
      this.loading = false
      window.location.href = '/'
    }
  }

  async refreshSession() {
    console.log('Refreshing session...')
    this.loading = true
    this.error = null
    
    try {
      const { data: { session }, error } = await this.withTimeout(
        supabase.auth.refreshSession(),
        5000
      )
      
      if (error) {
        console.error('Session refresh error:', error)
        this.error = 'Session refresh failed'
        return false
      }
      
      if (session?.user) {
        console.log('Session refreshed successfully')
        await this.handleUserSession(session.user)
        return true
      } else {
        console.log('No session after refresh')
        this.user = null
        this.profile = null
        return false
      }
    } catch (error) {
      console.error('Session refresh failed:', error)
      this.error = 'Session refresh failed'
      return false
    } finally {
      this.loading = false
    }
  }

  async resendVerificationEmail() {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: this.user?.email || '',
      options: {
        emailRedirectTo: `${window.location.origin}/auth/verify-email`,
      },
    })
    if (error) throw error
  }

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }

  async approveTeacher(teacherId: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'teacher' })
      .eq('id', teacherId)
    
    if (error) throw error
  }

  async rejectTeacher(teacherId: string) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', teacherId)
    
    if (error) throw error
  }

  async getPendingTeachers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'teacher_pending')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }

  // Computed values
  get isAuthenticated() {
    return this.user !== null
  }

  get isEmailVerified() {
    return this.user?.email_confirmed_at !== null
  }

  get isTeacher() {
    return this.profile?.role === 'teacher'
  }

  get isStudent() {
    return this.profile?.role === 'student'
  }

  get isTeacherPending() {
    return this.profile?.role === 'teacher_pending'
  }

  get isAdmin() {
    return this.profile?.role === 'admin'
  }

  get canAccessTeacherFeatures() {
    return this.profile?.role === 'teacher' || this.profile?.role === 'admin'
  }

  get displayName() {
    return this.profile?.full_name || this.user?.email || 'User'
  }
}

// Export the class for testing
export { AuthStore }

// Export singleton instance
export const authStore = new AuthStore()

// Export for backwards compatibility
export const { user, profile, loading } = authStore
export const { signInWithEmail, signUpWithEmail, signOut, resendVerificationEmail, resetPassword } = authStore