import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  generateHandwrittenCode, 
  generateTestSamples, 
  sampleToFile,
  HANDWRITING_STYLES,
  SAMPLE_SOLUTIONS 
} from './handwriting-generator.js'

// Mock Canvas and related APIs
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(() => ({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textBaseline: '',
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn()
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
}

// Mock DOM APIs
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => mockCanvas),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  }
})

Object.defineProperty(global, 'atob', {
  value: vi.fn((str: string) => 'mocked-binary-data')
})

Object.defineProperty(global, 'Uint8Array', {
  value: class MockUint8Array {
    constructor(length: number) {
      return new Array(length).fill(0)
    }
  }
})

Object.defineProperty(global, 'Blob', {
  value: class MockBlob {
    constructor(data: any[], options: any) {
      this.type = options.type
    }
    type: string = ''
  }
})

Object.defineProperty(global, 'File', {
  value: class MockFile {
    constructor(data: any[], name: string, options: any) {
      this.name = name
      this.type = options.type
      this.size = 1024 // Mock size
    }
    name: string = ''
    type: string = ''
    size: number = 0
  }
})

describe('Handwriting Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateHandwrittenCode', () => {
    it('should generate base64 image data', () => {
      const code = 'public boolean isEven(int n) {\n    return n % 2 == 0;\n}'
      const result = generateHandwrittenCode(code, HANDWRITING_STYLES.student_neat)
      
      expect(result).toMatch(/^data:image\/png;base64,/)
      expect(mockCanvas.getContext).toHaveBeenCalled()
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png')
    })

    it('should handle different handwriting styles', () => {
      const code = 'public void test() {}'
      
      Object.values(HANDWRITING_STYLES).forEach(style => {
        const result = generateHandwrittenCode(code, style)
        expect(result).toMatch(/^data:image\/png;base64,/)
      })
    })

    it('should handle multi-line code correctly', () => {
      const multiLineCode = `public boolean isEven(int n) {
    if (n % 2 == 0) {
        return true;
    } else {
        return false;
    }
}`
      
      const result = generateHandwrittenCode(multiLineCode, HANDWRITING_STYLES.student_careful)
      expect(result).toMatch(/^data:image\/png;base64,/)
      
      // Verify canvas setup was called
      expect(mockCanvas.getContext).toHaveBeenCalled()
    })
  })

  describe('generateTestSamples', () => {
    it('should generate samples for all solutions and styles', () => {
      const samples = generateTestSamples()
      
      const expectedCount = SAMPLE_SOLUTIONS.length * Object.keys(HANDWRITING_STYLES).length
      expect(samples).toHaveLength(expectedCount)
      
      // Verify each sample has required properties
      samples.forEach(sample => {
        expect(sample).toHaveProperty('code')
        expect(sample).toHaveProperty('style')
        expect(sample).toHaveProperty('imageData')
        expect(sample).toHaveProperty('expectedGrade')
        expect(sample.imageData).toMatch(/^data:image\/png;base64,/)
        
        // Check new style properties
        expect(sample.style).toHaveProperty('fontFamily')
        expect(sample.style).toHaveProperty('fontSize')
        expect(sample.style).toHaveProperty('pressureVariation')
      })
    })

    it('should include all sample solutions', () => {
      const samples = generateTestSamples()
      
      SAMPLE_SOLUTIONS.forEach(solution => {
        const matchingSamples = samples.filter(s => s.code === solution.code)
        expect(matchingSamples.length).toBeGreaterThan(0)
      })
    })

    it('should include all handwriting styles', () => {
      const samples = generateTestSamples()
      
      Object.keys(HANDWRITING_STYLES).forEach(styleName => {
        const style = HANDWRITING_STYLES[styleName]
        const matchingSamples = samples.filter(s => 
          s.style.penColor === style.penColor &&
          s.style.slant === style.slant
        )
        expect(matchingSamples.length).toBeGreaterThan(0)
      })
    })
  })

  describe('sampleToFile', () => {
    it('should convert sample to File object', () => {
      const mockSample = {
        code: 'test code',
        style: HANDWRITING_STYLES.student_neat,
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        expectedGrade: { communication: 4, correctness: 4, logic: 4 }
      }
      
      const file = sampleToFile(mockSample, 'test.png')
      
      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('test.png')
      expect(file.type).toBe('image/png')
    })

    it('should use default filename if not provided', () => {
      const mockSample = {
        code: 'test',
        style: HANDWRITING_STYLES.student_neat,
        imageData: 'data:image/png;base64,test',
        expectedGrade: { communication: 3, correctness: 3, logic: 3 }
      }
      
      const file = sampleToFile(mockSample)
      expect(file.name).toBe('handwriting.png')
    })
  })

  describe('HANDWRITING_STYLES', () => {
    it('should have required style properties', () => {
      Object.values(HANDWRITING_STYLES).forEach(style => {
        expect(style).toHaveProperty('penColor')
        expect(style).toHaveProperty('penWidth')
        expect(style).toHaveProperty('slant')
        expect(style).toHaveProperty('spacing')
        expect(style).toHaveProperty('messiness')
        expect(style).toHaveProperty('letterSpacing')
        expect(style).toHaveProperty('fontFamily')
        expect(style).toHaveProperty('fontSize')
        expect(style).toHaveProperty('pressureVariation')
        
        // Validate ranges
        expect(style.slant).toBeGreaterThanOrEqual(-1)
        expect(style.slant).toBeLessThanOrEqual(1)
        expect(style.messiness).toBeGreaterThanOrEqual(0)
        expect(style.messiness).toBeLessThanOrEqual(1)
        expect(style.pressureVariation).toBeGreaterThanOrEqual(0)
        expect(style.pressureVariation).toBeLessThanOrEqual(1)
        expect(style.penWidth).toBeGreaterThan(0)
        expect(style.fontSize).toBeGreaterThan(0)
        expect(style.fontFamily).toBeTruthy()
      })
    })

    it('should include different style variations', () => {
      const styles = Object.keys(HANDWRITING_STYLES)
      expect(styles).toContain('student_neat')
      expect(styles).toContain('student_messy')
      expect(styles).toContain('student_rushed')
      expect(styles).toContain('student_careful')
      expect(styles).toContain('student_sloppy')
      expect(styles).toContain('student_print')
    })
  })

  describe('SAMPLE_SOLUTIONS', () => {
    it('should have valid structure', () => {
      SAMPLE_SOLUTIONS.forEach(solution => {
        expect(solution).toHaveProperty('description')
        expect(solution).toHaveProperty('code')
        expect(solution).toHaveProperty('expectedGrade')
        
        expect(solution.description).toBeTruthy()
        expect(solution.code).toBeTruthy()
        
        const grade = solution.expectedGrade
        expect(grade.communication).toBeGreaterThanOrEqual(1)
        expect(grade.communication).toBeLessThanOrEqual(4)
        expect(grade.correctness).toBeGreaterThanOrEqual(1)
        expect(grade.correctness).toBeLessThanOrEqual(4)
        expect(grade.logic).toBeGreaterThanOrEqual(1)
        expect(grade.logic).toBeLessThanOrEqual(4)
      })
    })

    it('should include variety of quality levels', () => {
      const grades = SAMPLE_SOLUTIONS.map(s => s.expectedGrade)
      
      // Should have at least one high-quality solution
      const hasHighQuality = grades.some(g => 
        g.communication >= 4 && g.correctness >= 4 && g.logic >= 4
      )
      expect(hasHighQuality).toBe(true)
      
      // Should have at least one low-quality solution
      const hasLowQuality = grades.some(g => 
        g.communication <= 2 || g.correctness <= 2 || g.logic <= 2
      )
      expect(hasLowQuality).toBe(true)
    })
  })
})