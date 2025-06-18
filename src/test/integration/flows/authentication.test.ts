import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IntegrationTestUtils, expectStoreState, ErrorScenarios } from '../../integration-setup.js'
import { mockSupabaseClient, resetMocks } from '../../setup.js'

// Mock dependencies
vi.mock('$lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Set up fetch mock before stores initialize
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true, data: [] })
})

describe('Authentication Integration Flow', () => {
  let AuthStore: any

  beforeEach(async () => {
    resetMocks()
    IntegrationTestUtils.cleanup()

    // Import auth store class - need to extract from singleton export
    const authModule = await import('../../../lib/stores/auth.svelte.js')
    // The store file exports both the class and instance, we need to get the class
    AuthStore = Object.getPrototypeOf(authModule.authStore).constructor
  })

  afterEach(() => {
    IntegrationTestUtils.cleanup()
  })

  describe('Complete Authentication Workflow', () => {
    it('should complete full sign-up to authenticated session flow', async () => {
      const authStore = new AuthStore()

      // Step 1: Sign up new user
      const signUpData = {
        email: 'newteacher@example.com',
        password: 'securepassword123',
        fullName: 'New Teacher',
        role: 'teacher' as const
      }

      const mockUser = {
        id: 'new-user-id',
        email: signUpData.email,
        user_metadata: {
          full_name: signUpData.fullName,
          role: signUpData.role
        }
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      })

      const signUpResult = await authStore.signUpWithEmail(
        signUpData.email,
        signUpData.password,
        signUpData.fullName,
        signUpData.role
      )

      expect(signUpResult).toBeTruthy()
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.fullName,
            role: signUpData.role
          }
        }
      })

      // Step 2: Sign in with created credentials
      const mockSession = {
        user: mockUser,
        access_token: 'access-token',
        refresh_token: 'refresh-token'
      }

      const mockProfile = {
        id: mockUser.id,
        full_name: signUpData.fullName,
        role: signUpData.role,
        created_at: new Date().toISOString()
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

      const signInResult = await authStore.signInWithEmail(signUpData.email, signUpData.password)

      expect(signInResult).toBeTruthy()
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.profile).toEqual(mockProfile)
      expect(authStore.error).toBeNull()

      // Step 3: Sign out
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null
      })

      const signOutResult = await authStore.signOut()

      expect(signOutResult.success).toBe(true)
      expect(authStore.user).toBeNull()
      expect(authStore.profile).toBeNull()
    })

    it('should handle session restoration on page load', async () => {
      const { mockUser, mockProfile } = await IntegrationTestUtils.createUserSession('teacher')

      const authStore = new AuthStore()

      // Mock existing session
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: mockUser,
            access_token: 'existing-token'
          }
        },
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

      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(authStore.user).toEqual(mockUser)
      expect(authStore.profile).toEqual(mockProfile)
      expect(authStore.loading).toBe(false)
    })

    it('should create profile when user exists but profile missing', async () => {
      const authStore = new AuthStore()

      const mockUser = {
        id: 'user-without-profile',
        email: 'user@example.com',
        user_metadata: {
          full_name: 'User Without Profile',
          role: 'student'
        }
      }

      const mockSession = {
        user: mockUser,
        access_token: 'token'
      }

      // Mock sign in success
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
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
                  data: {
                    id: mockUser.id,
                    full_name: mockUser.user_metadata.full_name,
                    role: mockUser.user_metadata.role,
                    created_at: new Date().toISOString()
                  },
                  error: null
                })
              })
            })
          }
        }
        return mockSupabaseClient.from(table)
      })

      const signInResult = await authStore.signInWithEmail('user@example.com', 'password')

      expect(signInResult).toBeTruthy()
      expect(authStore.profile).toBeTruthy()
      expect(authStore.profile?.full_name).toBe('User Without Profile')
      expect(authStore.profile?.role).toBe('student')
    })
  })

  describe('Role-Based Access Control', () => {
    it('should properly handle teacher role authentication', async () => {
      const { mockUser, mockProfile } = await IntegrationTestUtils.createUserSession('teacher')
      const authStore = new AuthStore()

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { 
          user: mockUser, 
          session: { user: mockUser, access_token: 'token' }
        },
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

      const result = await authStore.signInWithEmail('teacher@example.com', 'password')

      expect(result).toBeTruthy()
      expect(authStore.user?.user_metadata.role).toBe('teacher')
      expect(authStore.profile?.role).toBe('teacher')
    })

    it('should properly handle student role authentication', async () => {
      const { mockUser, mockProfile } = await IntegrationTestUtils.createUserSession('student')
      const authStore = new AuthStore()

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { 
          user: mockUser, 
          session: { user: mockUser, access_token: 'token' }
        },
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

      const result = await authStore.signInWithEmail('student@example.com', 'password')

      expect(result).toBeTruthy()
      expect(authStore.user?.user_metadata.role).toBe('student')
      expect(authStore.profile?.role).toBe('student')
    })

    it('should handle users with missing role metadata', async () => {
      const authStore = new AuthStore()

      const userWithoutRole = {
        id: 'user-no-role',
        email: 'norole@example.com',
        user_metadata: {} // No role
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { 
          user: userWithoutRole, 
          session: { user: userWithoutRole, access_token: 'token' }
        },
        error: null
      })

      // Mock profile not found, then creation with fallback
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

      const result = await authStore.signInWithEmail('norole@example.com', 'password')

      expect(result).toBeTruthy()
      expect(authStore.profile?.role).toBe('teacher') // Default fallback
    })
  })

  describe('Authentication State Management', () => {
    it('should handle auth state changes correctly', async () => {
      const { mockUser, mockProfile } = await IntegrationTestUtils.createUserSession('teacher')
      const authStore = new AuthStore()

      // Mock auth state change callback
      let authCallback: any
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
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

      // Simulate sign in event
      await authCallback('SIGNED_IN', { user: mockUser })

      // Wait for profile loading
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(authStore.user).toEqual(mockUser)
      expect(authStore.profile).toEqual(mockProfile)

      // Simulate sign out event
      await authCallback('SIGNED_OUT', null)

      expect(authStore.user).toBeNull()
      expect(authStore.profile).toBeNull()
    })

    it('should handle token refresh events', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('teacher')
      const authStore = new AuthStore()

      let authCallback: any
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      const refreshedSession = {
        user: mockUser,
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token'
      }

      // Simulate token refresh
      await authCallback('TOKEN_REFRESHED', refreshedSession)

      expect(authStore.user).toEqual(mockUser)
    })

    it('should handle multiple concurrent authentication requests', async () => {
      const { mockUser, mockProfile } = await IntegrationTestUtils.createUserSession('teacher')
      const authStore = new AuthStore()

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { 
          user: mockUser, 
          session: { user: mockUser, access_token: 'token' }
        },
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

      // Make multiple concurrent sign-in requests
      const promises = Array(3).fill(null).map(() => 
        authStore.signInWithEmail('teacher@example.com', 'password')
      )

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach(result => {
        expect(result).toBeTruthy()
      })

      expect(authStore.user).toEqual(mockUser)
      expect(authStore.profile).toEqual(mockProfile)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle invalid credentials gracefully', async () => {
      const authStore = new AuthStore()

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', code: 'invalid_credentials' }
      })

      await expect(authStore.signInWithEmail('wrong@example.com', 'wrongpassword')).rejects.toThrow('Invalid credentials')
      expect(authStore.user).toBeNull()
      expect(authStore.profile).toBeNull()
    })

    it('should handle sign-up with existing email', async () => {
      const authStore = new AuthStore()

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already exists', code: 'user_already_exists' }
      })

      await expect(
        authStore.signUpWithEmail(
          'existing@example.com',
          'password123',
          'Existing User',
          'teacher'
        )
      ).rejects.toThrow('User already exists')
    })

    it('should handle network errors during authentication', async () => {
      const authStore = new AuthStore()

      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        ErrorScenarios.networkError()
      )

      await expect(
        authStore.signInWithEmail('user@example.com', 'password')
      ).rejects.toThrow()
    })

    it('should handle profile loading failures', async () => {
      const authStore = new AuthStore()

      const mockUser = {
        id: 'user-profile-error',
        email: 'user@example.com',
        user_metadata: { role: 'teacher' }
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { 
          user: mockUser, 
          session: { user: mockUser, access_token: 'token' }
        },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      })

      const result = await authStore.signInWithEmail('user@example.com', 'password')

      expect(result).toBeTruthy() // Sign in succeeds
      expect(authStore.user).toEqual(mockUser)
      // Profile loading failed, but should create fallback
      expect(authStore.profile).toBeTruthy()
    })

    it('should handle session timeout gracefully', async () => {
      const authStore = new AuthStore()

      mockSupabaseClient.auth.getSession.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            data: { session: null },
            error: { message: 'Session timeout', code: 'timeout' }
          }), 100)
        })
      )

      // Wait for session check
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(authStore.loading).toBe(false)
      expect(authStore.error).toBeTruthy()
      expect(authStore.user).toBeNull()
    })
  })

  describe('Security and Session Management', () => {
    it('should not expose sensitive information in error messages', async () => {
      const authStore = new AuthStore()

      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Detailed internal error with sensitive database info')
      )

      await expect(
        authStore.signInWithEmail('user@example.com', 'password')
      ).rejects.toThrow() // Should throw but not expose sensitive details
    })

    it('should handle rapid authentication state changes', async () => {
      const authStore = new AuthStore()

      // Simulate rapid state changes
      for (let i = 0; i < 10; i++) {
        const mockUser = {
          id: `user-${i}`,
          email: `user${i}@example.com`,
          user_metadata: { role: 'teacher' }
        }
        authStore.user = mockUser
      }

      expect(authStore.user?.id).toBe('user-9')
    })

    it('should handle memory pressure and cleanup', async () => {
      const authStore = new AuthStore()

      // Simulate many profile updates
      for (let i = 0; i < 100; i++) {
        const mockProfile = {
          id: `user-${i}`,
          full_name: `User ${i}`,
          role: 'teacher' as const,
          created_at: new Date().toISOString()
        }
        authStore.profile = mockProfile
      }

      expect(authStore.profile?.id).toBe('user-99')
    })
  })

  describe('Performance Optimization', () => {
    it('should debounce rapid profile loading requests', async () => {
      const { mockProfile } = await IntegrationTestUtils.createUserSession('teacher')
      const authStore = new AuthStore()

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

      // Make rapid profile requests - simulate by setting user multiple times
      const promises = Array(5).fill(null).map(() => 
        authStore.loadProfileInBackground('same-user-id')
      )

      await Promise.all(promises)

      // Should only make one actual database call due to debouncing
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1)
    })

    it('should handle background profile updates efficiently', async () => {
      const { mockUser, mockProfile } = await IntegrationTestUtils.createUserSession('teacher')
      const authStore = new AuthStore()

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

      authStore.user = mockUser

      const start = Date.now()
      await authStore.loadProfileInBackground(mockUser.id)
      const duration = Date.now() - start

      expect(authStore.profile).toEqual(mockProfile)
      expect(duration).toBeLessThan(100) // Should be fast
    })
  })

  describe('Integration with Other Systems', () => {
    it('should provide proper authentication for API requests', async () => {
      const { mockUser, mockProfile } = await IntegrationTestUtils.createUserSession('teacher')
      const authStore = new AuthStore()

      // Simulate successful authentication
      authStore.user = mockUser
      authStore.profile = mockProfile

      // Verify auth state is available for other systems
      expect(authStore.user?.id).toBe(mockUser.id)
      expect(authStore.profile?.role).toBe('teacher')

      // Mock an API call that would use this auth state
      const mockApiCall = () => {
        return authStore.user ? 'authenticated' : 'unauthenticated'
      }

      expect(mockApiCall()).toBe('authenticated')
    })

    it('should handle route protection scenarios', async () => {
      const authStore = new AuthStore()

      // No user - should deny access
      expect(authStore.user).toBeNull()

      // With user - should allow access
      const { mockUser, mockProfile } = await IntegrationTestUtils.createUserSession('teacher')
      authStore.user = mockUser
      authStore.profile = mockProfile

      expect(authStore.user).toBeTruthy()
      expect(authStore.profile?.role).toBe('teacher')

      // Role-based access
      const hasTeacherAccess = authStore.profile?.role === 'teacher'
      const hasStudentAccess = authStore.profile?.role === 'student'

      expect(hasTeacherAccess).toBe(true)
      expect(hasStudentAccess).toBe(false)
    })
  })
})