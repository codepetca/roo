import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateQuestion, gradeCode } from './claude.js'
import type { JavaConcept } from '$lib/types/index.js'

// Mock Anthropic
vi.mock('@anthropic-ai/sdk')

describe('Claude AI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateQuestion', () => {
    it('should generate a valid question with required fields', async () => {
      const concepts: JavaConcept[] = ['variables', 'conditionals']
      
      // Mock successful response
      const mockResponse = {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            question: 'Write a Java method that checks if a number is positive.',
            rubric: {
              communication: { description: 'Code formatting', weight: 0.25, criteria: ['indentation'] },
              correctness: { description: 'Syntax accuracy', weight: 0.50, criteria: ['syntax'] },
              logic: { description: 'Problem solving', weight: 0.25, criteria: ['logic'] }
            },
            solution: {
              code: 'public boolean isPositive(int num) {\n  return num > 0;\n}',
              explanation: 'Simple positive number check'
            },
            concepts: ['variables', 'conditionals']
          })
        }]
      }

      // The mock is already set up in test setup
      const mockCreate = vi.fn().mockResolvedValue(mockResponse)
      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: mockCreate }
        }))
      }))

      const result = await generateQuestion(concepts)

      expect(result).toMatchObject({
        question: expect.any(String),
        rubric: expect.objectContaining({
          communication: expect.objectContaining({ weight: 0.25 }),
          correctness: expect.objectContaining({ weight: 0.50 }),
          logic: expect.objectContaining({ weight: 0.25 })
        }),
        solution: expect.objectContaining({
          code: expect.any(String),
          explanation: expect.any(String)
        }),
        concepts: expect.arrayContaining(concepts)
      })

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('variables, conditionals')
          })
        ])
      })
    })

    it('should handle API errors gracefully', async () => {
      const concepts: JavaConcept[] = ['variables']
      
      const anthropic = await import('@anthropic-ai/sdk')
      const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'))
      vi.mocked(anthropic.default).mockImplementation(() => ({
        messages: { create: mockCreate }
      }) as any)

      await expect(generateQuestion(concepts)).rejects.toThrow('Failed to generate question')
    })

    it('should validate solution length constraint', async () => {
      const concepts: JavaConcept[] = ['variables']
      
      // Mock response with solution that's too long
      const longSolution = Array(15).fill('  System.out.println("line");').join('\n')
      const mockLongResponse = {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            question: 'Test question',
            rubric: { communication: { weight: 0.25 }, correctness: { weight: 0.50 }, logic: { weight: 0.25 } },
            solution: { code: longSolution, explanation: 'Too long' },
            concepts: ['variables']
          })
        }]
      }

      // Mock response with acceptable solution
      const shortSolution = 'public int add(int a, int b) {\n  return a + b;\n}'
      const mockShortResponse = {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            question: 'Test question',
            rubric: { communication: { weight: 0.25 }, correctness: { weight: 0.50 }, logic: { weight: 0.25 } },
            solution: { code: shortSolution, explanation: 'Simple addition' },
            concepts: ['variables']
          })
        }]
      }

      const anthropic = await import('@anthropic-ai/sdk')
      const mockCreate = vi.fn()
        .mockResolvedValueOnce(mockLongResponse) // First attempt fails validation
        .mockResolvedValueOnce(mockShortResponse) // Second attempt passes
      
      vi.mocked(anthropic.default).mockImplementation(() => ({
        messages: { create: mockCreate }
      }) as any)

      const result = await generateQuestion(concepts)
      
      // Should use the second, shorter solution
      expect(result.solution.code).toBe(shortSolution)
      expect(mockCreate).toHaveBeenCalledTimes(2) // Should retry once
    })
  })

  describe('gradeCode', () => {
    it('should grade submitted code and return structured feedback', async () => {
      const imageBase64 = 'base64imagedata'
      const question = 'Write a method that adds two numbers'
      const rubric = {
        communication: { weight: 0.25 },
        correctness: { weight: 0.50 },
        logic: { weight: 0.25 }
      }

      const mockGradingResponse = {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            extractedCode: 'public int add(int a, int b) {\n  return a + b;\n}',
            scores: { communication: 4, correctness: 4, logic: 4 },
            feedback: {
              communication: 'Excellent formatting and readability',
              correctness: 'Perfect syntax and Java conventions',
              logic: 'Correctly solves the problem'
            },
            overallScore: 4.0,
            generalComments: 'Great work!'
          })
        }]
      }

      const anthropic = await import('@anthropic-ai/sdk')
      const mockCreate = vi.fn().mockResolvedValue(mockGradingResponse)
      vi.mocked(anthropic.default).mockImplementation(() => ({
        messages: { create: mockCreate }
      }) as any)

      const result = await gradeCode(imageBase64, question, rubric)

      expect(result).toMatchObject({
        extractedCode: expect.any(String),
        scores: expect.objectContaining({
          communication: expect.any(Number),
          correctness: expect.any(Number),
          logic: expect.any(Number)
        }),
        feedback: expect.objectContaining({
          communication: expect.any(String),
          correctness: expect.any(String),
          logic: expect.any(String)
        }),
        overallScore: expect.any(Number),
        generalComments: expect.any(String)
      })

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'text' }),
              expect.objectContaining({ 
                type: 'image',
                source: expect.objectContaining({
                  type: 'base64',
                  data: imageBase64
                })
              })
            ])
          })
        ])
      })
    })

    it('should handle grading errors appropriately', async () => {
      const anthropic = await import('@anthropic-ai/sdk')
      const mockCreate = vi.fn().mockRejectedValue(new Error('Grading failed'))
      vi.mocked(anthropic.default).mockImplementation(() => ({
        messages: { create: mockCreate }
      }) as any)

      await expect(gradeCode('image', 'question', {})).rejects.toThrow('Failed to grade submission')
    })
  })
})