import { describe, it, expect } from 'vitest'

// Simple validation utilities for the Java grading system
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidImageFile(file: File): boolean {
  return file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB
}

export function isValidScore(score: number): boolean {
  return score >= 1 && score <= 4 && Number.isInteger(score)
}

export function calculateWeightedScore(scores: Record<string, number>, weights: Record<string, number>): number {
  let totalScore = 0
  let totalWeight = 0
  
  for (const [category, score] of Object.entries(scores)) {
    const weight = weights[category] || 0
    totalScore += score * weight
    totalWeight += weight
  }
  
  return totalWeight > 0 ? totalScore / totalWeight : 0
}

export function validateJavaMethodSignature(signature: string): boolean {
  // Basic validation for Java method signatures
  const methodRegex = /^(public|private|protected)?\s*(static)?\s*\w+\s+\w+\s*\([^)]*\)$/
  return methodRegex.test(signature.trim())
}

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should accept valid email addresses', () => {
      expect(isValidEmail('student@school.edu')).toBe(true)
      expect(isValidEmail('teacher.name@district.org')).toBe(true)
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('no@domain')).toBe(false)
      expect(isValidEmail('@missing-local.com')).toBe(false)
      expect(isValidEmail('missing-at.com')).toBe(false)
    })
  })

  describe('isValidImageFile', () => {
    it('should accept valid image files under size limit', () => {
      const jpegFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(jpegFile, 'size', { value: 1024 * 1024 }) // 1MB
      expect(isValidImageFile(jpegFile)).toBe(true)

      const pngFile = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(pngFile, 'size', { value: 5 * 1024 * 1024 }) // 5MB
      expect(isValidImageFile(pngFile)).toBe(true)
    })

    it('should reject non-image files', () => {
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      Object.defineProperty(textFile, 'size', { value: 1024 })
      expect(isValidImageFile(textFile)).toBe(false)
    })

    it('should reject files over size limit', () => {
      const largeFile = new File(['test'], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 }) // 15MB
      expect(isValidImageFile(largeFile)).toBe(false)
    })
  })

  describe('isValidScore', () => {
    it('should accept valid scores', () => {
      expect(isValidScore(1)).toBe(true)
      expect(isValidScore(2)).toBe(true)
      expect(isValidScore(3)).toBe(true)
      expect(isValidScore(4)).toBe(true)
    })

    it('should reject invalid scores', () => {
      expect(isValidScore(0)).toBe(false)
      expect(isValidScore(5)).toBe(false)
      expect(isValidScore(2.5)).toBe(false)
      expect(isValidScore(-1)).toBe(false)
    })
  })

  describe('calculateWeightedScore', () => {
    it('should calculate weighted scores correctly', () => {
      const scores = { communication: 3, correctness: 4, logic: 3 }
      const weights = { communication: 0.25, correctness: 0.50, logic: 0.25 }
      
      const result = calculateWeightedScore(scores, weights)
      expect(result).toBeCloseTo(3.5, 2) // 3*0.25 + 4*0.5 + 3*0.25 = 3.5
    })

    it('should handle missing categories gracefully', () => {
      const scores = { communication: 3, correctness: 4 }
      const weights = { communication: 0.25, correctness: 0.50, logic: 0.25 }
      
      const result = calculateWeightedScore(scores, weights)
      expect(result).toBeCloseTo(3.67, 1) // (3*0.25 + 4*0.5) / (0.25 + 0.5) = 2.75/0.75 = 3.67
    })

    it('should return 0 for empty scores', () => {
      const result = calculateWeightedScore({}, {})
      expect(result).toBe(0)
    })
  })

  describe('validateJavaMethodSignature', () => {
    it('should accept valid Java method signatures', () => {
      expect(validateJavaMethodSignature('public boolean isEven(int n)')).toBe(true)
      expect(validateJavaMethodSignature('private static void helper()')).toBe(true)
      expect(validateJavaMethodSignature('int calculate(double x, String name)')).toBe(true)
    })

    it('should reject invalid method signatures', () => {
      expect(validateJavaMethodSignature('not a method')).toBe(false)
      expect(validateJavaMethodSignature('public boolean')).toBe(false)
      expect(validateJavaMethodSignature('boolean isEven(int n) {')).toBe(false)
    })
  })
})