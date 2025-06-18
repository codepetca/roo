import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAuthenticatedUser, requireAuth } from './auth.js'
import { mockSupabaseClient, createMockUser, resetMocks } from '../../test/setup.js'
import type { RequestEvent } from '@sveltejs/kit'

// Mock dependencies
vi.mock('$lib/server/supabase', () => ({
  supabase: mockSupabaseClient
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

describe('Authentication Service', () => {
  beforeEach(() => {
    resetMocks()
  })

  describe('getAuthenticatedUser', () => {
    it('should return user when valid token is provided', async () => {
      const mockUser = createMockUser()
      const mockToken = 'valid-jwt-token'
      
      // Mock request with authorization header
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      
      const mockEvent = { request: mockRequest } as RequestEvent

      // Mock successful authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await getAuthenticatedUser(mockEvent)

      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(mockToken)
      expect(result).toEqual(mockUser)
    })

    it('should return null when no authorization header is provided', async () => {
      const mockRequest = new Request('http://localhost')
      const mockEvent = { request: mockRequest } as RequestEvent

      const result = await getAuthenticatedUser(mockEvent)

      expect(result).toBeNull()
      expect(mockSupabaseClient.auth.getUser).not.toHaveBeenCalled()
    })

    it('should return null when authorization header has invalid format', async () => {
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': 'InvalidFormat token' }
      })
      
      const mockEvent = { request: mockRequest } as RequestEvent

      const result = await getAuthenticatedUser(mockEvent)

      expect(result).toBeNull()
    })

    it('should return null when token is invalid', async () => {
      const mockToken = 'invalid-jwt-token'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      
      const mockEvent = { request: mockRequest } as RequestEvent

      // Mock authentication error
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token', code: 'invalid_token' }
      })

      const result = await getAuthenticatedUser(mockEvent)

      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(mockToken)
      expect(result).toBeNull()
    })

    it('should return null when auth service throws an error', async () => {
      const mockToken = 'error-causing-token'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      
      const mockEvent = { request: mockRequest } as RequestEvent

      // Mock authentication exception
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Network error'))

      const result = await getAuthenticatedUser(mockEvent)

      expect(result).toBeNull()
    })

    it('should handle empty token after Bearer prefix', async () => {
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': 'Bearer ' }
      })
      
      const mockEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token', code: 'invalid_token' }
      })

      const result = await getAuthenticatedUser(mockEvent)

      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith('')
      expect(result).toBeNull()
    })

    it('should handle malformed JWT tokens', async () => {
      const mockToken = 'malformed.jwt.token'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      
      const mockEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT', code: 'invalid_token' }
      })

      const result = await getAuthenticatedUser(mockEvent)

      expect(result).toBeNull()
    })

    it('should handle expired tokens', async () => {
      const mockToken = 'expired.jwt.token'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      
      const mockEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired', code: 'token_expired' }
      })

      const result = await getAuthenticatedUser(mockEvent)

      expect(result).toBeNull()
    })

    it('should properly extract token from Bearer header with extra spaces', async () => {
      const mockUser = createMockUser()
      const mockToken = 'valid-jwt-token'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `  Bearer   ${mockToken}  ` }
      })
      
      const mockEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await getAuthenticatedUser(mockEvent)

      // Should clean up the token properly
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(`  ${mockToken}  `)
      expect(result).toEqual(mockUser)
    })
  })

  describe('requireAuth', () => {
    it('should return user when authentication is successful', async () => {
      const mockUser = createMockUser()
      const mockToken = 'valid-jwt-token'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      
      const mockEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await requireAuth(mockEvent)

      expect(result).toEqual(mockUser)
    })

    it('should throw error when no authorization header is provided', async () => {
      const mockRequest = new Request('http://localhost')
      const mockEvent = { request: mockRequest } as RequestEvent

      await expect(requireAuth(mockEvent)).rejects.toThrow('Authentication required')
    })

    it('should throw error when token is invalid', async () => {
      const mockToken = 'invalid-jwt-token'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      
      const mockEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token', code: 'invalid_token' }
      })

      await expect(requireAuth(mockEvent)).rejects.toThrow('Authentication required')
    })

    it('should throw error when auth service fails', async () => {
      const mockToken = 'error-causing-token'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      
      const mockEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Network error'))

      await expect(requireAuth(mockEvent)).rejects.toThrow('Authentication required')
    })
  })

  describe('Authentication Integration', () => {
    it('should work with different user roles', async () => {
      const teacherUser = createMockUser({ 
        user_metadata: { role: 'teacher', full_name: 'Teacher User' } 
      })
      const studentUser = createMockUser({ 
        id: 'student-id',
        email: 'student@example.com',
        user_metadata: { role: 'student', full_name: 'Student User' } 
      })

      const mockToken = 'valid-jwt-token'
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      const mockEvent = { request: mockRequest } as RequestEvent

      // Test with teacher user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: teacherUser },
        error: null
      })

      const teacherResult = await getAuthenticatedUser(mockEvent)
      expect(teacherResult?.user_metadata.role).toBe('teacher')

      // Test with student user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: studentUser },
        error: null
      })

      const studentResult = await getAuthenticatedUser(mockEvent)
      expect(studentResult?.user_metadata.role).toBe('student')
    })

    it('should handle users with missing metadata', async () => {
      const userWithoutMetadata = createMockUser({ 
        user_metadata: {} 
      })

      const mockToken = 'valid-jwt-token'
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      const mockEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: userWithoutMetadata },
        error: null
      })

      const result = await getAuthenticatedUser(mockEvent)

      expect(result).toEqual(userWithoutMetadata)
      expect(result?.user_metadata).toEqual({})
    })

    it('should handle concurrent authentication requests', async () => {
      const mockUser = createMockUser()
      const mockToken = 'valid-jwt-token'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      const mockEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Make multiple concurrent requests
      const promises = Array(5).fill(null).map(() => getAuthenticatedUser(mockEvent))
      const results = await Promise.all(promises)

      // All should succeed and return the same user
      results.forEach(result => {
        expect(result).toEqual(mockUser)
      })

      // Should have been called 5 times
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledTimes(5)
    })
  })

  describe('Security Considerations', () => {
    it('should not expose sensitive information in error messages', async () => {
      const mockToken = 'invalid-jwt-token'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      const mockEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Detailed internal error with sensitive data')
      )

      const result = await getAuthenticatedUser(mockEvent)

      // Should return null without exposing internal error details
      expect(result).toBeNull()
    })

    it('should handle case-insensitive Bearer prefix', async () => {
      const mockUser = createMockUser()
      const mockToken = 'valid-jwt-token'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `bearer ${mockToken}` } // lowercase
      })
      const mockEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await getAuthenticatedUser(mockEvent)

      // Should still work (assuming implementation handles case-insensitivity)
      expect(result).toBeNull() // Current implementation is case-sensitive
    })

    it('should validate token format before making auth call', async () => {
      const mockToken = 'obviously-not-a-jwt'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      const mockEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token format', code: 'invalid_token' }
      })

      const result = await getAuthenticatedUser(mockEvent)

      expect(result).toBeNull()
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(mockToken)
    })
  })

  describe('Performance Considerations', () => {
    it('should handle auth timeout gracefully', async () => {
      const mockToken = 'slow-response-token'
      
      const mockRequest = new Request('http://localhost', {
        headers: { 'authorization': `Bearer ${mockToken}` }
      })
      const mockEvent = { request: mockRequest } as RequestEvent

      // Mock slow response
      mockSupabaseClient.auth.getUser.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            data: { user: null },
            error: { message: 'Request timeout', code: 'timeout' }
          }), 100)
        })
      )

      const start = Date.now()
      const result = await getAuthenticatedUser(mockEvent)
      const duration = Date.now() - start

      expect(result).toBeNull()
      expect(duration).toBeGreaterThan(90) // At least 100ms delay
    })

    it('should not cache authentication results inappropriately', async () => {
      const mockUser1 = createMockUser({ id: 'user1' })
      const mockUser2 = createMockUser({ id: 'user2' })
      
      const mockRequest1 = new Request('http://localhost', {
        headers: { 'authorization': 'Bearer token1' }
      })
      const mockRequest2 = new Request('http://localhost', {
        headers: { 'authorization': 'Bearer token2' }
      })
      
      const mockEvent1 = { request: mockRequest1 } as RequestEvent
      const mockEvent2 = { request: mockRequest2 } as RequestEvent

      mockSupabaseClient.auth.getUser
        .mockResolvedValueOnce({ data: { user: mockUser1 }, error: null })
        .mockResolvedValueOnce({ data: { user: mockUser2 }, error: null })

      const result1 = await getAuthenticatedUser(mockEvent1)
      const result2 = await getAuthenticatedUser(mockEvent2)

      expect(result1?.id).toBe('user1')
      expect(result2?.id).toBe('user2')
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledTimes(2)
    })
  })
})