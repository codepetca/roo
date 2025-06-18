import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSupabaseClient, createMockUser, createMockProfile, resetMocks } from '../../test/setup.js'
import type { User } from '@supabase/supabase-js'

// Mock dependencies
vi.mock('$lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

describe('Authentication Store', () => {
  let AuthStore: any

  beforeEach(async () => {
    resetMocks()
    // Dynamic import to ensure fresh instance
    const module = await import('./auth.svelte.js')
    AuthStore = module.AuthStore
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const authStore = new AuthStore()
      
      expect(authStore.user).toBeNull()
      expect(authStore.profile).toBeNull()
      expect(authStore.loading).toBe(true)
      expect(authStore.error).toBeNull()
    })

    it('should start session initialization on creation', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const authStore = new AuthStore()
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
      expect(authStore.loading).toBe(false)
    })
  })

  describe('Session Management', () => {
    it('should handle valid session during initialization', async () => {
      const mockUser = createMockUser()
      const mockProfile = createMockProfile()
      const mockSession = {
        user: mockUser,
        access_token: 'valid-token',
        refresh_token: 'refresh-token'
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      const authStore = new AuthStore()
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.profile).toEqual(mockProfile)
      expect(authStore.loading).toBe(false)
      expect(authStore.error).toBeNull()
    })

    it('should handle session initialization error', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error', code: 'session_error' }
      })

      const authStore = new AuthStore()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(authStore.user).toBeNull()
      expect(authStore.profile).toBeNull()
      expect(authStore.loading).toBe(false)
      expect(authStore.error).toContain('Session error')
    })

    it('should handle session timeout gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            data: { session: null },
            error: { message: 'Timeout', code: 'timeout' }
          }), 3000) // Simulate 3s timeout
        })
      )

      const authStore = new AuthStore()
      
      // Wait for timeout to trigger
      await new Promise(resolve => setTimeout(resolve, 3100))
      
      expect(authStore.loading).toBe(false)
      expect(authStore.error).toBeTruthy()
    })
  })

  describe('Profile Loading', () => {
    it('should load profile successfully when user exists', async () => {
      const mockUser = createMockUser()
      const mockProfile = createMockProfile()

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      const authStore = new AuthStore()
      await authStore.loadProfile(mockUser.id)
      
      expect(authStore.profile).toEqual(mockProfile)
      expect(authStore.error).toBeNull()
    })

    it('should create profile when user exists but profile doesn\'t', async () => {
      const mockUser = createMockUser({
        user_metadata: {
          full_name: 'New User',
          role: 'student'
        }
      })

      // Mock profile not found, then successful creation
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Profile not found', code: 'PGRST116' }
                })
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createMockProfile({
                    id: mockUser.id,
                    full_name: mockUser.user_metadata.full_name,
                    role: mockUser.user_metadata.role
                  }),
                  error: null
                })
              })
            })
          }
        }
        return mockSupabaseClient.from(table)
      })

      const authStore = new AuthStore()
      authStore.user = mockUser
      await authStore.loadProfile(mockUser.id)
      
      expect(authStore.profile).toBeTruthy()
      expect(authStore.profile?.full_name).toBe('New User')
      expect(authStore.profile?.role).toBe('student')
    })

    it('should create fallback profile when metadata is missing', async () => {
      const mockUser = createMockUser({
        user_metadata: {} // No metadata
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found', code: 'PGRST116' }
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' }
            })
          })
        })
      })

      const authStore = new AuthStore()
      authStore.user = mockUser
      await authStore.loadProfile(mockUser.id)
      
      // Should create fallback profile
      expect(authStore.profile).toBeTruthy()
      expect(authStore.profile?.role).toBe('teacher') // Default fallback
    })

    it('should handle profile loading with timeout', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => 
              new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Operation timed out after 2000ms')), 2100)
              })
            )
          })
        })
      })

      const authStore = new AuthStore()
      await authStore.loadProfile('user-id')
      
      expect(authStore.error).toContain('timed out')
    })
  })

  describe('Authentication Actions', () => {
    it('should sign in successfully with valid credentials', async () => {
      const mockUser = createMockUser()
      const mockProfile = createMockProfile()
      const mockSession = {
        user: mockUser,
        access_token: 'token',
        refresh_token: 'refresh'
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      const authStore = new AuthStore()
      const result = await authStore.signIn('test@example.com', 'password123')
      
      expect(result.success).toBe(true)
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.profile).toEqual(mockProfile)
      expect(authStore.error).toBeNull()
    })

    it('should handle sign in failure with invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', code: 'invalid_credentials' }
      })

      const authStore = new AuthStore()
      const result = await authStore.signIn('wrong@example.com', 'wrongpassword')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid credentials')
      expect(authStore.user).toBeNull()
      expect(authStore.profile).toBeNull()
    })

    it('should sign up successfully with valid data', async () => {
      const mockUser = createMockUser()
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        fullName: 'New User',
        role: 'student' as const
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      })

      const authStore = new AuthStore()
      const result = await authStore.signUp(userData)
      
      expect(result.success).toBe(true)
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            role: userData.role
          }
        }
      })
    })

    it('should handle sign up failure with existing email', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already exists', code: 'user_already_exists' }
      })

      const authStore = new AuthStore()
      const result = await authStore.signUp({
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'User',
        role: 'student'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('User already exists')
    })

    it('should sign out successfully', async () => {
      const mockUser = createMockUser()
      const mockProfile = createMockProfile()

      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null
      })

      const authStore = new AuthStore()
      authStore.user = mockUser
      authStore.profile = mockProfile
      
      const result = await authStore.signOut()
      
      expect(result.success).toBe(true)
      expect(authStore.user).toBeNull()
      expect(authStore.profile).toBeNull()
    })

    it('should handle sign out error', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed', code: 'signout_error' }
      })

      const authStore = new AuthStore()
      const result = await authStore.signOut()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Sign out failed')
    })
  })

  describe('Auth State Changes', () => {
    it('should handle auth state change to signed in', async () => {
      const mockUser = createMockUser()
      const mockProfile = createMockProfile()
      const mockSession = { user: mockUser }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      // Mock auth state change callback
      let authCallback: any
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      const authStore = new AuthStore()
      
      // Simulate auth state change
      await authCallback('SIGNED_IN', mockSession)
      
      // Wait for profile loading
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.profile).toEqual(mockProfile)
    })

    it('should handle auth state change to signed out', async () => {
      let authCallback: any
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      const authStore = new AuthStore()
      authStore.user = createMockUser()
      authStore.profile = createMockProfile()
      
      // Simulate sign out
      await authCallback('SIGNED_OUT', null)
      
      expect(authStore.user).toBeNull()
      expect(authStore.profile).toBeNull()
    })

    it('should handle token refresh', async () => {
      const mockUser = createMockUser()
      const refreshedSession = {
        user: mockUser,
        access_token: 'new-token',
        refresh_token: 'new-refresh-token'
      }

      let authCallback: any
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      const authStore = new AuthStore()
      
      // Simulate token refresh
      await authCallback('TOKEN_REFRESHED', refreshedSession)
      
      expect(authStore.user).toEqual(mockUser)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should retry failed operations', async () => {
      const mockUser = createMockUser()
      const mockProfile = createMockProfile()

      // First call fails, second succeeds
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn()
              .mockRejectedValueOnce(new Error('Network error'))
              .mockResolvedValueOnce({
                data: mockProfile,
                error: null
              })
          })
        })
      })

      const authStore = new AuthStore()
      await authStore.loadProfile(mockUser.id)
      
      // Should eventually succeed after retry
      expect(authStore.profile).toEqual(mockProfile)
    })

    it('should handle concurrent authentication requests', async () => {
      const mockUser = createMockUser()
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { user: mockUser } },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createMockProfile(),
              error: null
            })
          })
        })
      })

      const authStore = new AuthStore()
      
      // Make multiple concurrent sign-in requests
      const promises = Array(3).fill(null).map(() => 
        authStore.signIn('test@example.com', 'password123')
      )
      
      const results = await Promise.all(promises)
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
      
      expect(authStore.user).toEqual(mockUser)
    })

    it('should handle memory pressure and cleanup', async () => {
      const authStore = new AuthStore()
      
      // Simulate many rapid profile updates
      for (let i = 0; i < 100; i++) {
        const mockProfile = createMockProfile({ id: `user-${i}` })
        authStore.profile = mockProfile
      }
      
      // Should not cause memory issues
      expect(authStore.profile?.id).toBe('user-99')
    })

    it('should handle network disconnection gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(
        new Error('Network request failed')
      )

      const authStore = new AuthStore()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(authStore.loading).toBe(false)
      expect(authStore.error).toBeTruthy()
      expect(authStore.user).toBeNull()
    })
  })

  describe('Performance and Optimization', () => {
    it('should debounce rapid profile requests', async () => {
      const mockProfile = createMockProfile()
      
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      const authStore = new AuthStore()
      
      // Make rapid profile requests
      const promises = Array(5).fill(null).map(() => 
        authStore.loadProfile('same-user-id')
      )
      
      await Promise.all(promises)
      
      // Should only make one actual database call due to debouncing
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1)
    })

    it('should handle background profile updates efficiently', async () => {
      const mockUser = createMockUser()
      const mockProfile = createMockProfile()

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      const authStore = new AuthStore()
      authStore.user = mockUser
      
      const start = Date.now()
      await authStore.loadProfileInBackground(mockUser.id)
      const duration = Date.now() - start
      
      expect(authStore.profile).toEqual(mockProfile)
      expect(duration).toBeLessThan(100) // Should be fast
    })

    it('should clean up resources properly', async () => {
      const authStore = new AuthStore()
      
      // Simulate cleanup
      const unsubscribeSpy = vi.fn()
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: unsubscribeSpy } }
      })
      
      // This would typically happen in component unmount
      authStore.cleanup?.()
      
      expect(unsubscribeSpy).toHaveBeenCalled()
    })
  })
})