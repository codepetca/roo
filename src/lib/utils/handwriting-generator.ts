/**
 * Handwriting Generator for Testing
 * Creates realistic handwritten Java code samples for testing the grading system
 */

export interface HandwritingStyle {
  penColor: string
  penWidth: number
  slant: number // -1 to 1, negative = left slant, positive = right slant
  spacing: number // line spacing multiplier
  messiness: number // 0 to 1, how messy the handwriting is
  letterSpacing: number
  fontFamily: string // handwritten-style font
  fontSize: number
  pressureVariation: number // 0 to 1, how much pen pressure varies
}

export interface HandwritingSample {
  code: string
  style: HandwritingStyle
  imageData: string // base64 encoded image
  expectedGrade?: {
    communication: number
    correctness: number
    logic: number
  }
}

// Predefined handwriting styles with realistic fonts
export const HANDWRITING_STYLES: Record<string, HandwritingStyle> = {
  student_neat: {
    penColor: '#001155',
    penWidth: 2.2,
    slant: 0.08,
    spacing: 1.3,
    messiness: 0.15,
    letterSpacing: 1.05,
    fontFamily: 'Kalam, cursive',
    fontSize: 16,
    pressureVariation: 0.3
  },
  student_messy: {
    penColor: '#000000',
    penWidth: 2.8,
    slant: -0.15,
    spacing: 0.95,
    messiness: 0.8,
    letterSpacing: 1.2,
    fontFamily: 'Caveat, cursive',
    fontSize: 17,
    pressureVariation: 0.7
  },
  student_rushed: {
    penColor: '#1a1a1a',
    penWidth: 2.5,
    slant: 0.25,
    spacing: 0.85,
    messiness: 0.6,
    letterSpacing: 0.92,
    fontFamily: 'Patrick Hand, cursive',
    fontSize: 15,
    pressureVariation: 0.5
  },
  student_careful: {
    penColor: '#003366',
    penWidth: 1.9,
    slant: 0.02,
    spacing: 1.45,
    messiness: 0.08,
    letterSpacing: 1.15,
    fontFamily: 'Schoolbell, cursive',
    fontSize: 16,
    pressureVariation: 0.2
  },
  student_sloppy: {
    penColor: '#222222',
    penWidth: 3.2,
    slant: -0.3,
    spacing: 0.75,
    messiness: 0.9,
    letterSpacing: 1.3,
    fontFamily: 'Shadows Into Light, cursive',
    fontSize: 18,
    pressureVariation: 0.8
  },
  student_print: {
    penColor: '#000080',
    penWidth: 2.1,
    slant: 0,
    spacing: 1.2,
    messiness: 0.25,
    letterSpacing: 1.1,
    fontFamily: 'Architects Daughter, cursive',
    fontSize: 15,
    pressureVariation: 0.4
  }
}

// Sample Java code solutions with varying quality
export const SAMPLE_SOLUTIONS = [
  {
    description: "Perfect solution - even number check",
    code: `public boolean isEven(int n) {
    return n % 2 == 0;
}`,
    expectedGrade: { communication: 4, correctness: 4, logic: 4 }
  },
  {
    description: "Good solution with minor formatting issues",
    code: `public boolean isEven(int n){
return n%2==0;
}`,
    expectedGrade: { communication: 3, correctness: 4, logic: 4 }
  },
  {
    description: "Working but verbose solution",
    code: `public boolean isEven(int n) {
    if (n % 2 == 0) {
        return true;
    } else {
        return false;
    }
}`,
    expectedGrade: { communication: 3, correctness: 4, logic: 3 }
  },
  {
    description: "Incorrect solution with syntax error",
    code: `public boolean isEven(int n) {
    return n % 2 = 0; // syntax error: should be ==
}`,
    expectedGrade: { communication: 3, correctness: 1, logic: 3 }
  },
  {
    description: "Incomplete solution",
    code: `public boolean isEven(int n) {
    // TODO: implement this
}`,
    expectedGrade: { communication: 2, correctness: 1, logic: 1 }
  },
  {
    description: "Solution with poor variable names",
    code: `public boolean isEven(int x) {
    int y = x % 2;
    if (y == 0) return true;
    return false;
}`,
    expectedGrade: { communication: 2, correctness: 4, logic: 3 }
  }
]

/**
 * Generates a handwritten code sample as a base64 image
 */
export function generateHandwrittenCode(
  code: string, 
  style: HandwritingStyle = HANDWRITING_STYLES.student_neat
): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  // Set canvas size to simulate answer sheet
  canvas.width = 800
  canvas.height = 600
  
  // Fill with paper-like background with slight texture
  ctx.fillStyle = '#fcfcfc'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Add paper texture
  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = `rgba(240, 240, 240, ${Math.random() * 0.3})`
    ctx.fillRect(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      Math.random() * 3,
      Math.random() * 3
    )
  }
  
  // Add ruled lines like notebook paper (slightly imperfect)
  ctx.strokeStyle = '#d8d8d8'
  ctx.lineWidth = 0.8
  const lineHeight = (25 + style.fontSize) * style.spacing
  for (let y = 50; y < canvas.height; y += lineHeight) {
    const lineVariation = (Math.random() - 0.5) * 2
    ctx.beginPath()
    ctx.moveTo(50, y + lineVariation)
    ctx.lineTo(canvas.width - 50, y + lineVariation)
    ctx.stroke()
  }
  
  // Add left margin line
  ctx.strokeStyle = '#e8a8a8'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(80, 30)
  ctx.lineTo(80, canvas.height - 30)
  ctx.stroke()
  
  // Set up text rendering with handwritten font
  ctx.fillStyle = style.penColor
  ctx.font = `${style.fontSize}px ${style.fontFamily}`
  ctx.textBaseline = 'alphabetic'
  
  // Split code into lines and render with handwriting effects
  const lines = code.split('\n')
  let currentY = 75
  
  lines.forEach((line, lineIndex) => {
    if (currentY > canvas.height - 60) return // Don't overflow
    
    // Starting position with random variation
    let baseX = 90 + (Math.random() - 0.5) * 15 * style.messiness
    
    // Add indentation variation
    const indentMatch = line.match(/^(\s*)/)
    const indentLevel = indentMatch ? indentMatch[1].length : 0
    baseX += indentLevel * (18 + Math.random() * 4)
    
    const trimmedLine = line.trim()
    
    // Render each character with natural handwriting variations
    for (let i = 0; i < trimmedLine.length; i++) {
      const char = trimmedLine[i]
      
      // Calculate character position with natural spacing variation
      const charSpacing = (style.fontSize * 0.6) * style.letterSpacing
      const charX = baseX + i * charSpacing + (Math.random() - 0.5) * 2 * style.messiness
      
      // Add baseline variation and slant
      const baselineVariation = (Math.random() - 0.5) * 4 * style.messiness
      const slantEffect = charX * style.slant * 0.02
      const charY = currentY + baselineVariation + slantEffect
      
      // Pressure variation affects color opacity
      const pressureAlpha = 1 - (Math.random() * style.pressureVariation * 0.4)
      const charColor = style.penColor + Math.floor(pressureAlpha * 255).toString(16).padStart(2, '0')
      
      ctx.save()
      ctx.fillStyle = charColor
      
      // Add character rotation for natural look
      ctx.translate(charX, charY)
      ctx.rotate((Math.random() - 0.5) * 0.08 * style.messiness)
      
      // Slight scale variation
      const scaleVar = 1 + (Math.random() - 0.5) * 0.1 * style.messiness
      ctx.scale(scaleVar, scaleVar)
      
      ctx.fillText(char, 0, 0)
      ctx.restore()
    }
    
    // Line spacing with natural variation
    currentY += lineHeight + (Math.random() - 0.5) * 8 * style.messiness
  })
  
  // Add realistic writing artifacts
  addWritingArtifacts(ctx, style, canvas.width, canvas.height)
  
  return canvas.toDataURL('image/png')
}

/**
 * Adds realistic writing artifacts like ink smudges, pen skips, etc.
 */
function addWritingArtifacts(ctx: CanvasRenderingContext2D, style: HandwritingStyle, width: number, height: number): void {
  // Ink blots and smudges
  if (style.messiness > 0.4) {
    for (let i = 0; i < Math.random() * 4; i++) {
      ctx.fillStyle = style.penColor + '30'
      ctx.beginPath()
      ctx.ellipse(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 3 + 1,
        Math.random() * 2 + 0.5,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
  }
  
  // Pen pressure marks (darker spots)
  if (style.pressureVariation > 0.5) {
    for (let i = 0; i < Math.random() * 6; i++) {
      ctx.fillStyle = style.penColor + '60'
      ctx.beginPath()
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 1.5 + 0.5,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
  }
  
  // Eraser marks
  if (style.messiness > 0.6) {
    for (let i = 0; i < Math.random() * 2; i++) {
      ctx.fillStyle = '#f5f5f5'
      ctx.beginPath()
      ctx.ellipse(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 15 + 5,
        Math.random() * 8 + 3,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
  }
  
  // Coffee/water stains
  if (Math.random() < 0.1) {
    ctx.fillStyle = 'rgba(210, 180, 140, 0.1)'
    ctx.beginPath()
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      Math.random() * 30 + 10,
      0,
      Math.PI * 2
    )
    ctx.fill()
  }
}

/**
 * Generates a set of test samples with different handwriting styles
 */
export function generateTestSamples(): HandwritingSample[] {
  const samples: HandwritingSample[] = []
  
  // Generate samples for each solution with different styles
  SAMPLE_SOLUTIONS.forEach((solution, solutionIndex) => {
    Object.entries(HANDWRITING_STYLES).forEach(([styleName, style]) => {
      const imageData = generateHandwrittenCode(solution.code, style)
      
      samples.push({
        code: solution.code,
        style: style,
        imageData: imageData,
        expectedGrade: solution.expectedGrade
      })
    })
  })
  
  return samples
}

/**
 * Downloads a handwriting sample as an image file
 */
export function downloadSample(sample: HandwritingSample, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = sample.imageData
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Converts a handwriting sample to a File object for testing
 */
export function sampleToFile(sample: HandwritingSample, filename: string = 'handwriting.png'): File {
  // Convert base64 to blob
  const base64Data = sample.imageData.split(',')[1]
  const binaryData = atob(base64Data)
  const bytes = new Uint8Array(binaryData.length)
  
  for (let i = 0; i < binaryData.length; i++) {
    bytes[i] = binaryData.charCodeAt(i)
  }
  
  const blob = new Blob([bytes], { type: 'image/png' })
  return new File([blob], filename, { type: 'image/png' })
}