import { supabase } from '$lib/supabase.js'
import type { User } from '@supabase/supabase-js'
import type { UserProfile, UserRole } from '$lib/types/index.js'
import { PerformanceMonitor, debounce } from '$lib/utils/performance.js'

class AuthStore {
  user = $state<User | null>(null)
  profile = $state<UserProfile | null>(null)
  loading = $state(true)
  initialized = $state(false)
  error = $state<string | null>(null)
  private performanceMonitor = PerformanceMonitor.getInstance()

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeAuth()
    }
  }

  private async initializeAuth() {
    // Set up auth state change listener (fast, non-blocking)
    supabase.auth.onAuthStateChange(async (event, session) => {
      this.error = null
      this.user = session?.user ?? null

      if (session?.user) {
        // Fast profile creation, no blocking
        this.handleUserSession(session.user)
      } else {
        this.profile = null
      }
    })

    // Fast initial session check
    try {
      const { data: { session } } = await this.withTimeout(
        supabase.auth.getSession(),
        1000 // Much shorter timeout
      )
      
      if (session?.user) {
        this.user = session.user
        this.handleUserSession(session.user)
      }
    } catch (error) {
      // Don't set error - just continue without blocking
    }
    
    // Always complete initialization quickly
    this.loading = false
    this.initialized = true
  }

  private async handleUserSession(user: User) {
    // FAST PATH: Create fallback profile immediately
    this.createFallbackProfile(user)
    
    // BACKGROUND: Try to load real profile, but don't block UI
    this.loadProfileInBackground(user.id)
  }

  private async loadProfileInBackground(userId: string) {
    try {
      const { data, error } = await this.withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).single(),
        2000 // Shorter timeout for background load
      )

      if (!error && data) {
        const userProfileData: UserProfile = {
          ...data,
          role: data.role as UserRole,
          created_at: data.created_at ?? new Date().toISOString(),
        }
        
        this.profile = userProfileData
      }
    } catch (error) {
      // Fallback is already set, no need to do anything
    }
  }

  private createFallbackProfile(user: User) {
    const fallbackProfile: UserProfile = {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      role: (user.user_metadata?.role as UserRole) || 'student',
      created_at: user.created_at || new Date().toISOString(),
    }
    
    this.profile = fallbackProfile
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
          await this.loadProfileInBackground(user.id)
        } else {
          this.setFallbackProfile(user)
        }
      } catch (createError) {
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
    this.loading = true
    
    try {
      const { error } = await this.withTimeout(supabase.auth.signOut(), 5000)
      if (error) throw error

      // Clear stores
      this.user = null
      this.profile = null
      this.error = null
      this.loading = false

      // Force page reload to clear any cached state
      window.location.href = '/'
    } catch (error) {
      // Force reload anyway to clear state
      this.user = null
      this.profile = null
      this.error = null
      this.loading = false
      window.location.href = '/'
    }
  }

  async refreshSession() {
    this.loading = true
    this.error = null
    
    try {
      const { data: { session }, error } = await this.withTimeout(
        supabase.auth.refreshSession(),
        5000
      )
      
      if (error) {
        this.error = 'Session refresh failed'
        return false
      }
      
      if (session?.user) {
        await this.handleUserSession(session.user)
        return true
      } else {
        this.user = null
        this.profile = null
        return false
      }
    } catch (error) {
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

  async getAllUsers(roleFilter?: string) {
    return this.performanceMonitor.measureAsync('getAllUsers', async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (roleFilter) {
        query = query.eq('role', roleFilter)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data
    })
  }

  async updateAccountStatus(userId: string, status: 'active' | 'disabled' | 'suspended') {
    const { error } = await supabase
      .from('profiles')
      .update({ account_status: status })
      .eq('id', userId)
    
    if (error) throw error
  }

  async enrollStudent(studentData: any) {
    // Create auth user first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: studentData.email,
      password: this.generateTempPassword(),
      email_confirm: true,
      user_metadata: {
        full_name: studentData.full_name,
        role: 'student',
        class_name: studentData.class_name,
        student_id: studentData.student_id
      }
    })

    if (authError) throw authError

    // Profile will be created by database trigger
    return authData
  }

  async bulkEnrollStudents(students: any[]) {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
      results: [] as any[]
    }

    for (const student of students) {
      try {
        await this.enrollStudent(student)
        results.successful++
        results.results.push({
          email: student.email,
          success: true
        })
      } catch (error: any) {
        results.failed++
        const errorMsg = error.message || 'Unknown error'
        results.errors.push(`${student.email}: ${errorMsg}`)
        results.results.push({
          email: student.email,
          success: false,
          error: errorMsg
        })
      }
    }

    return results
  }

  async updateStudentClass(studentId: string, className: string | null) {
    const { error } = await supabase
      .from('profiles')
      .update({ class_name: className })
      .eq('id', studentId)
    
    if (error) throw error
  }

  private generateTempPassword(): string {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
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