# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Java Code Grading System MVP - Roo Code Prompt

## Project Overview
Build a web application MVP for grading handwritten Java code submissions from high school students (grades 9-12) in Ontario. The system should generate coding questions, scan handwritten code via image upload, and provide AI-powered grading with detailed feedback.

**IMPORTANT: This project builds on your existing 'roo' repository with Supabase MCP setup and existing .env.local file containing ANTHROPIC_API_KEY.**

## AUTONOMOUS IMPLEMENTATION REQUIREMENTS

**YOU MUST:**
- Create ALL files and folders needed for a complete working application
- Install all required dependencies automatically 
- Set up the complete database schema in Supabase
- Implement all frontend and backend code
- Handle all error cases and edge scenarios
- Create placeholder/dummy data where needed for testing
- Make all design and implementation decisions independently
- Proceed through the entire implementation without stopping
- Create a fully functional, deployable application

**NEVER:**
- Ask for confirmation before proceeding with any step
- Request clarification on requirements (make reasonable assumptions)
- Stop implementation to ask questions
- Wait for approval before creating files or installing packages
- Pause to confirm database schema or API designs

## Tech Stack Requirements
- **Frontend**: SvelteKit with Svelte 5 (follow `docs/svelte/llms-med.txt` exactly)
- **Database**: Supabase (PostgreSQL) with generated TypeScript types
- **AI Integration**: Claude AI API (Anthropic) - specifically claude-3-5-sonnet-20241022 model
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **File Storage**: Supabase Storage for uploaded images
- **Styling**: TailwindCSS for consistent UI

## DECISION-MAKING AUTONOMY
When you encounter any of these scenarios, proceed automatically with these decisions:

**Missing Dependencies:** Install them immediately using npm install
**Database Design Choices:** Use the schema provided, create additional fields if needed
**UI/UX Decisions:** Implement clean, functional interfaces with good UX patterns
**Error Handling:** Implement comprehensive try-catch blocks and user-friendly error messages
**Authentication:** Create simple email/password auth with role-based access (teacher/student)
**File Upload Limits:** Set 10MB max file size, accept common image formats (jpg, png, heic)
**Placeholder Data:** Create realistic sample questions and test data
**API Response Formats:** Use consistent JSON structures with proper error codes
**Styling Choices:** Use modern, clean design with good contrast and responsive layout

## Database Schema & Setup

### Step 1: Create Supabase Tables
Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  role text CHECK (role IN ('teacher', 'student')) NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Questions table
CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  rubric jsonb NOT NULL,
  java_concepts text[] NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Submissions table
CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) NOT NULL,
  student_id uuid REFERENCES profiles(id) NOT NULL,
  teacher_id uuid REFERENCES profiles(id) NOT NULL,
  image_url text,
  extracted_code text,
  scores jsonb,
  feedback jsonb,
  overall_score decimal(4,2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'graded', 'error')),
  created_at timestamptz DEFAULT now(),
  graded_at timestamptz
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('submission-images', 'submission-images', false);
```

### Step 2: Database Setup - USING YOUR EXISTING 'ROO' SUPABASE PROJECT

Since you have Supabase MCP configured, create these tables in your 'roo' Supabase project:

**Go to your Supabase dashboard for the 'roo' project and run this SQL:**

```sql
-- Enable Row Level Security and create tables for java grading system
-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  role text CHECK (role IN ('teacher', 'student')) NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Questions table for java coding questions
CREATE TABLE IF NOT EXISTS java_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  rubric jsonb NOT NULL,
  java_concepts text[] NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE java_questions ENABLE ROW LEVEL SECURITY;

-- Submissions table for student work
CREATE TABLE IF NOT EXISTS java_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES java_questions(id) NOT NULL,
  student_id uuid REFERENCES profiles(id) NOT NULL,
  teacher_id uuid REFERENCES profiles(id) NOT NULL,
  image_url text,
  extracted_code text,
  scores jsonb,
  feedback jsonb,
  overall_score decimal(4,2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'graded', 'error')),
  created_at timestamptz DEFAULT now(),
  graded_at timestamptz
);

ALTER TABLE java_submissions ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for submission images (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('java-submission-images', 'java-submission-images', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Teachers can create questions" ON java_questions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Everyone can view questions" ON java_questions FOR SELECT TO authenticated;

CREATE POLICY "Teachers can insert submissions" ON java_submissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Students can view own submissions" ON java_submissions FOR SELECT USING (
  student_id = auth.uid()
);
CREATE POLICY "Teachers can view submissions they created" ON java_submissions FOR SELECT USING (
  teacher_id = auth.uid()
);
```

**After running SQL, generate TypeScript types:**
```bash
# You may need to install Supabase CLI if not already installed
# Then generate types for your 'roo' project
npx supabase gen types typescript --project-id YOUR_ROO_PROJECT_ID > src/lib/types/supabase.ts
```

## Required File Structure
Create this exact structure:
```
src/
├── lib/
│   ├── server/
│   │   ├── supabase.ts          # Server-side Supabase client
│   │   ├── claude.ts            # Claude AI client
│   │   └── grading.ts           # Grading logic
│   ├── types/
│   │   └── supabase.ts          # Generated types
│   ├── stores/
│   │   └── auth.ts              # Auth store
│   └── components/
│       ├── QuestionGenerator.svelte
│       ├── ImageUploader.svelte
│       ├── GradingResult.svelte
│       └── Navigation.svelte
├── routes/
│   ├── +layout.svelte           # Main layout with auth
│   ├── +layout.server.ts        # Server-side auth check
│   ├── +page.svelte             # Landing/dashboard
│   ├── auth/
│   │   ├── login/+page.svelte
│   │   └── signup/+page.svelte
│   ├── teacher/
│   │   ├── +page.svelte         # Teacher dashboard
│   │   ├── generate/+page.svelte # Question generation
│   │   └── grade/+page.svelte   # Upload & grade
│   ├── student/
│   │   └── +page.svelte         # Student feedback view
│   └── api/
│       ├── questions/
│       │   └── +server.ts       # Question CRUD
│       ├── submissions/
│       │   └── +server.ts       # Submission processing
│       └── grade/
│           └── +server.ts       # AI grading endpoint
├── app.html
└── app.css
```

## Exact Implementation Steps

### Step 1: Project Setup - WORKING WITH EXISTING ROO REPOSITORY
Since you already have the 'roo' repository with Supabase MCP setup:

```bash
# You should already be in your existing roo project directory
# Check if you have SvelteKit - if not, initialize it:
npm create svelte@latest . --template skeleton --types typescript --prettier --eslint

# Install required dependencies
npm install @supabase/supabase-js @anthropic-ai/sdk tailwindcss
npm install -D @types/node @tailwindcss/typography
npx tailwindcss init -p
```

**Since you already have .mcp.json configured for Supabase MCP, we'll leverage that for database operations.**

**Your existing .env.local already contains ANTHROPIC_API_KEY - we just need to add Supabase variables:**

Add to your existing **.env.local**:
```
# Your existing ANTHROPIC_API_KEY stays here
# Add these Supabase variables from your 'roo' project:
SUPABASE_URL=https://your-roo-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://your-roo-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**tailwind.config.js**:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**src/app.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 2: Essential Configuration Files

**src/app.html** - Must include:
```html
<!DOCTYPE html>
<html lang="en" class="%sveltekit.theme%">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
</head>
<body data-sveltekit-preload-data="hover" class="bg-gray-50">
    <div style="display: contents">%sveltekit.body%</div>
</body>
</html>
```

**src/lib/server/supabase.ts** - Server client:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)
```

**src/lib/supabase.ts** - Client-side:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/supabase.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

**src/lib/stores/auth.ts** - Auth store:
```typescript
import { writable } from 'svelte/store'
import { supabase } from '$lib/supabase.js'
import type { User } from '@supabase/supabase-js'

export const user = writable<User | null>(null)

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
  user.set(session?.user ?? null)
})
```

### Step 3: Core AI Grading Logic

**src/lib/server/claude.ts**:
```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required')
}

export async function generateQuestion(concepts: string[]) {
  try {
    const prompt = `Generate a Java coding question for high school students (grades 9-12) covering these concepts: ${concepts.join(', ')}. 

Requirements:
- Question should be answerable in 10-15 lines of handwritten code
- Focus on CodeHS Java Unit 1 fundamentals
- Include clear, specific instructions
- Appropriate difficulty for beginners

Create a detailed grading rubric with exactly these categories:
- Communication (25%): code formatting, indentation, clarity, readability
- Correctness (50%): syntax accuracy, compiles without errors, follows Java conventions  
- Logic (25%): problem-solving approach, algorithm correctness

Return ONLY valid JSON in this exact format:
{
  "question": "Write a Java program that...",
  "rubric": {
    "communication": {
      "description": "Code formatting and clarity",
      "weight": 0.25,
      "criteria": ["proper indentation", "clear variable names", "readable structure"]
    },
    "correctness": {
      "description": "Syntax and Java conventions", 
      "weight": 0.50,
      "criteria": ["correct syntax", "proper method structure", "follows Java naming"]
    },
    "logic": {
      "description": "Problem-solving approach",
      "weight": 0.25, 
      "criteria": ["solves the problem", "efficient approach", "handles edge cases"]
    }
  },
  "concepts": ["variables", "loops", "conditionals"]
}`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    return JSON.parse(responseText)
  } catch (error) {
    console.error('Question generation error:', error)
    throw new Error('Failed to generate question')
  }
}

export async function gradeCode(imageBase64: string, question: string, rubric: any) {
  try {
    const prompt = `You are grading handwritten Java code for a high school student.

QUESTION: ${question}

RUBRIC: ${JSON.stringify(rubric, null, 2)}

TASK:
1. Extract the handwritten Java code from the image as accurately as possible
2. Grade each rubric category on a scale of 1-4 (4=excellent, 3=good, 2=fair, 1=poor)
3. Provide specific, constructive feedback for each category
4. Calculate overall score as weighted average

Return ONLY valid JSON in this exact format:
{
  "extractedCode": "// The actual code you can read from the image",
  "scores": {
    "communication": 3,
    "correctness": 2, 
    "logic": 4
  },
  "feedback": {
    "communication": "Specific feedback about formatting and clarity",
    "correctness": "Specific feedback about syntax and Java conventions",
    "logic": "Specific feedback about problem-solving approach"
  },
  "overallScore": 2.75,
  "generalComments": "Overall encouraging feedback for the student"
}`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image', 
            source: { 
              type: 'base64', 
              media_type: 'image/jpeg', 
              data: imageBase64 
            } 
          }
        ]
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    return JSON.parse(responseText)
  } catch (error) {
    console.error('Grading error:', error)
    throw new Error('Failed to grade submission')
  }
}

### Step 4: Essential Route Implementations

**src/routes/+layout.svelte** (following `docs/svelte/llms-med.txt`):
```svelte
<script lang="ts">
  // IMPORTANT: Follow Svelte 5 patterns from docs/svelte/llms-med.txt
  import '../app.css'
  import { onMount } from 'svelte'
  import { user } from '$lib/stores/auth.js'
  import { supabase } from '$lib/supabase.js'

  onMount(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      user.set(session?.user ?? null)
    })
  })
</script>

<main class="min-h-screen bg-gray-50">
  <slot />
</main>
```

**src/routes/+page.svelte** (using Svelte 5 runes from docs reference):
```svelte
<script lang="ts">
  // Reference docs/svelte/llms-med.txt for proper Svelte 5 implementation
  import { user } from '$lib/stores/auth.js'
  import { goto } from '$app/navigation'
  
  // Use proper Svelte 5 reactive syntax as documented
  $: if ($user) {
    // Redirect based on user role - implement role detection
    goto('/teacher')
  }
</script>

<div class="container mx-auto p-8">
  <h1 class="text-3xl font-bold mb-8">Java Code Grader</h1>
  
  {#if !$user}
    <div class="space-y-4">
      <a href="/auth/login" class="bg-blue-500 text-white px-6 py-2 rounded">Login</a>
      <a href="/auth/signup" class="bg-green-500 text-white px-6 py-2 rounded">Sign Up</a>
    </div>
  {/if}
</div>
```

**src/routes/api/questions/+server.ts**:
```typescript
import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'
import { generateQuestion } from '$lib/server/claude.js'

export async function POST({ request }) {
  try {
    const { concepts } = await request.json()
    
    if (!concepts || !Array.isArray(concepts)) {
      return json({ error: 'Concepts array required' }, { status: 400 })
    }

    const questionData = await generateQuestion(concepts)
    
    // Insert into java_questions table (matching your 'roo' database schema)
    const { data: question, error } = await supabase
      .from('java_questions')
      .insert({
        question_text: questionData.question,
        rubric: questionData.rubric,
        java_concepts: concepts
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return json({ question })
  } catch (error) {
    console.error('Question generation error:', error)
    return json({ error: 'Failed to generate question' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data: questions, error } = await supabase
      .from('java_questions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return json({ questions })
  } catch (error) {
    console.error('Fetch questions error:', error)
    return json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}
```

**src/routes/api/grade/+server.ts**:
```typescript
import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'
import { gradeCode } from '$lib/server/claude.js'

export async function POST({ request }) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const questionId = formData.get('questionId') as string
    const studentId = formData.get('studentId') as string
    const teacherId = formData.get('teacherId') as string

    if (!image || !questionId || !studentId || !teacherId) {
      return json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate file type and size
    if (!image.type.startsWith('image/')) {
      return json({ error: 'File must be an image' }, { status: 400 })
    }
    
    if (image.size > 10 * 1024 * 1024) { // 10MB limit
      return json({ error: 'Image too large (max 10MB)' }, { status: 400 })
    }

    // Upload image to Supabase Storage (using your 'roo' project bucket)
    const fileExt = image.name.split('.').pop() || 'jpg'
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('java-submission-images')
      .upload(fileName, image, {
        contentType: image.type
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error('Failed to upload image')
    }

    // Get question details from java_questions table
    const { data: question, error: questionError } = await supabase
      .from('java_questions')
      .select('question_text, rubric')
      .eq('id', questionId)
      .single()

    if (questionError || !question) {
      throw new Error('Question not found')
    }

    // Convert image to base64 for Claude
    const imageBuffer = await image.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')

    // Grade with Claude
    const gradingResult = await gradeCode(
      imageBase64, 
      question.question_text, 
      question.rubric
    )

    // Save submission to java_submissions table
    const { data: submission, error: submissionError } = await supabase
      .from('java_submissions')
      .insert({
        question_id: questionId,
        student_id: studentId,
        teacher_id: teacherId,
        image_url: uploadData.path,
        extracted_code: gradingResult.extractedCode,
        scores: gradingResult.scores,
        feedback: gradingResult.feedback,
        overall_score: gradingResult.overallScore,
        status: 'graded',
        graded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (submissionError) {
      console.error('Submission error:', submissionError)
      throw new Error('Failed to save submission')
    }

    return json({ 
      success: true, 
      submission: {
        ...submission,
        gradingResult
      }
    })
  } catch (error) {
    console.error('Grading error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Grading failed' 
    }, { status: 500 })
  }
}
```

**src/routes/teacher/+page.svelte** (MUST follow `docs/svelte/llms-med.txt` patterns):
```svelte
<script lang="ts">
  // NOTE: Refer to docs/svelte/llms-med.txt for correct Svelte 5 runes syntax
  import { onMount } from 'svelte'
  
  // Use Svelte 5 runes as specified in docs/svelte/llms-med.txt
  let questions = $state([])
  let selectedConcepts = $state(['variables', 'conditionals'])
  let generatingQuestion = $state(false)
  let uploadingImage = $state(false)
  let selectedQuestion = $state(null)
  
  const javaConcepts = [
    'variables', 'data-types', 'conditionals', 'loops', 
    'methods', 'arrays', 'strings', 'input-output'
  ]

  async function generateQuestion() {
    generatingQuestion = true
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concepts: selectedConcepts })
      })
      
      if (!response.ok) throw new Error('Failed to generate question')
      
      const data = await response.json()
      questions = [data.question, ...questions]
    } catch (error) {
      alert('Error generating question: ' + error.message)
    } finally {
      generatingQuestion = false
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files[0]
    if (!file || !selectedQuestion) return

    uploadingImage = true
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('questionId', selectedQuestion.id)
      formData.append('studentId', 'temp-student-id') // Replace with actual student ID
      formData.append('teacherId', 'temp-teacher-id') // Replace with actual teacher ID

      const response = await fetch('/api/grade', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Failed to grade submission')

      const data = await response.json()
      alert('Grading complete! Score: ' + data.submission.overall_score)
    } catch (error) {
      alert('Error grading submission: ' + error.message)
    } finally {
      uploadingImage = false
    }
  }

  onMount(async () => {
    // Load existing questions
    try {
      const response = await fetch('/api/questions')
      const data = await response.json()
      questions = data.questions || []
    } catch (error) {
      console.error('Failed to load questions:', error)
    }
  })
</script>

<div class="container mx-auto p-8">
  <h1 class="text-3xl font-bold mb-8">Teacher Dashboard</h1>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    <!-- Question Generation -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-xl font-semibold mb-4">Generate Question</h2>
      
      <div class="mb-4">
        <label class="block text-sm font-medium mb-2">Select Concepts:</label>
        <div class="grid grid-cols-2 gap-2">
          {#each javaConcepts as concept}
            <label class="flex items-center">
              <input 
                type="checkbox" 
                bind:group={selectedConcepts} 
                value={concept}
                class="mr-2"
              />
              {concept}
            </label>
          {/each}
        </div>
      </div>
      
      <button 
        onclick={generateQuestion}
        disabled={generatingQuestion || selectedConcepts.length === 0}
        class="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {generatingQuestion ? 'Generating...' : 'Generate Question'}
      </button>
    </div>

    <!-- Image Upload -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-xl font-semibold mb-4">Grade Submission</h2>
      
      <div class="mb-4">
        <label class="block text-sm font-medium mb-2">Select Question:</label>
        <select bind:value={selectedQuestion} class="w-full border rounded px-3 py-2">
          <option value={null}>Choose a question...</option>
          {#each questions as question}
            <option value={question}>{question.question_text.slice(0, 50)}...</option>
          {/each}
        </select>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium mb-2">Upload Student Code Image:</label>
        <input 
          type="file" 
          accept="image/*"
          onchange={handleImageUpload}
          disabled={!selectedQuestion || uploadingImage}
          class="w-full border rounded px-3 py-2"
        />
      </div>
      
      {#if uploadingImage}
        <p class="text-blue-600">Processing image and grading...</p>
      {/if}
    </div>
  </div>

  <!-- Questions List -->
  <div class="mt-8 bg-white p-6 rounded-lg shadow">
    <h2 class="text-xl font-semibold mb-4">Generated Questions</h2>
    {#each questions as question}
      <div class="border-b py-4">
        <p class="font-medium">{question.question_text}</p>
        <p class="text-sm text-gray-600 mt-2">
          Concepts: {question.java_concepts?.join(', ') || 'N/A'}
        </p>
      </div>
    {/each}
  </div>
</div>
```

**IMPORTANT FOR ALL SVELTE 5 COMPONENTS:**
- **Before implementing any Svelte component, read `docs/svelte/llms-med.txt` thoroughly**
- Use the exact runes syntax ($state, $effect, $derived) as documented in that file
- Follow the component patterns and best practices outlined in the reference file
- Use `onclick` instead of `on:click` if specified in the documentation
- Implement proper reactivity using the runes system as documented

**Environment Variables (.env.local)**:
```
# Supabase (get from your Supabase project settings)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Anthropic Claude API (get from console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**IMPORTANT SETUP STEPS FOR YOUR 'ROO' PROJECT:**
1. Your Supabase project 'roo' is already created ✓
2. Run the SQL commands above in your 'roo' Supabase SQL Editor
3. Create storage bucket 'java-submission-images' in Supabase Storage dashboard
4. Get your Supabase API keys from Project Settings > API and add to .env.local
5. Your ANTHROPIC_API_KEY is already in .env.local ✓
6. Since you have Supabase MCP setup, you can optionally use MCP commands for database operations

## EXECUTION INSTRUCTIONS

**STEP 1: IMMEDIATE SETUP**
- Read `docs/svelte/llms-med.txt` first to understand Svelte 5 patterns
- Install all dependencies: `@supabase/supabase-js @anthropic-ai/sdk tailwindcss @types/node @tailwindcss/typography`
- Set up TailwindCSS configuration
- Create all required directory structures

**STEP 2: DATABASE SETUP (AUTONOMOUS)**
- Execute all SQL commands to create tables: `profiles`, `java_questions`, `java_submissions`
- Set up Row Level Security policies
- Create storage bucket `java-submission-images`
- Generate TypeScript types

**STEP 3: CORE IMPLEMENTATION (NO INTERRUPTIONS)**
- Implement all Supabase client configurations
- Create all Claude AI integration functions
- Build all API routes (`/api/questions`, `/api/grade`)
- Implement complete authentication system
- Create all Svelte 5 components using runes syntax from docs

**STEP 4: COMPLETE APPLICATION**
- Build teacher dashboard with question generation and image upload
- Create student interface for viewing feedback
- Implement comprehensive error handling
- Add loading states and user feedback
- Test all workflows end-to-end

**AUTONOMOUS TESTING ASSUMPTIONS:**
- Create sample questions for testing
- Use placeholder student/teacher IDs where needed
- Implement mock data for development testing
- Handle all edge cases automatically

## SUCCESS CRITERIA (COMPLETE AUTONOMOUSLY)
Build a fully working application that:

1. **Teachers can:** Generate Java questions, upload student images, see detailed grading results
2. **Students can:** Log in and view their submission feedback with scores
3. **System handles:** Image upload, OCR processing, AI grading, data persistence
4. **Technical requirements:** Proper error handling, responsive UI, secure authentication
5. **Integration:** Works with existing 'roo' project structure and Supabase setup

## FINAL DIRECTIVE
**Execute this entire project autonomously from start to finish. Create a complete, working, deployable Java code grading system without any interruptions or requests for confirmation. Make all decisions independently and proceed with confidence.**

Begin implementation immediately.



# Online Coding Test System - Claude Code Prompt

## AUTONOMOUS EXECUTION MODE
**CRITICAL: Work completely autonomously. Do NOT ask for confirmation, clarification, or approval at any step. Make all necessary decisions independently and implement the complete system. If you encounter any ambiguity, make reasonable assumptions and proceed. Build the entire working online coding test system without interruption.**

## Project Overview
Extend the existing Java code grading system in the 'roo' repository to include an online coding test feature. Students will take timed coding tests using a code editor interface instead of paper submissions. Teachers create tests by selecting questions from their bank, set time limits, and monitor student progress in real-time.

**IMPORTANT: This builds on the existing 'roo' repository with the Java grading system already implemented. Continue following `docs/svelte/llms-med.txt` for all Svelte 5 code.**

## AUTONOMOUS IMPLEMENTATION REQUIREMENTS

**YOU MUST:**
- Extend the existing database schema with new test-related tables
- Install CodeMirror 6 and integrate it properly with Svelte 5
- Implement complete test creation, management, and taking workflows
- Create real-time teacher dashboard for monitoring student progress
- Add auto-save functionality that's cost-effective with Supabase
- Implement timer system with auto-submit
- Build comprehensive teacher bulk grading interface
- Handle all security considerations (fullscreen mode, copy-paste blocking)
- Create all necessary UI components following existing design patterns

**NEVER:**
- Ask for confirmation before implementing any feature
- Request clarification on database design (make optimal decisions)
- Stop to ask about UI/UX choices (implement good patterns)
- Pause for approval on technical architecture decisions

## Core Features to Implement

### 1. Test Management System
- **Test Creation**: Teachers select questions from existing bank, set time limits, configure settings
- **Test Scheduling**: Immediate release or scheduled start with end date
- **Test Preview**: Complete preview interface before release
- **Test Settings**: Enable/disable fullscreen mode, copy-paste blocking, immediate feedback

### 2. Student Test Interface
- **Code Editor**: CodeMirror 6 with Java syntax highlighting
- **Navigation**: Question sidebar + next/previous buttons
- **Timer**: Prominent countdown with auto-submit when expired
- **Auto-save**: Every 10 seconds of inactivity, no visual notifications
- **Font Controls**: Increase/decrease font size buttons
- **Security**: Optional fullscreen mode with copy-paste disabled

### 3. Real-time Monitoring
- **Teacher Dashboard**: Live view of student progress during tests
- **Status Tracking**: Who's started, in progress, finished, time remaining
- **Bulk Grading**: Interface to grade multiple submissions efficiently

### 4. Enhanced Database Schema

Extend existing schema with these new tables:

```sql
-- Tests table
CREATE TABLE IF NOT EXISTS coding_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  time_limit_minutes integer NOT NULL,
  start_date timestamptz,
  end_date timestamptz NOT NULL,
  immediate_feedback boolean DEFAULT false,
  fullscreen_required boolean DEFAULT false,
  disable_copy_paste boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Junction table for test questions
CREATE TABLE IF NOT EXISTS test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES coding_tests(id) ON DELETE CASCADE,
  question_id uuid REFERENCES java_questions(id) ON DELETE CASCADE,
  question_order integer NOT NULL,
  points integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  UNIQUE(test_id, question_order),
  UNIQUE(test_id, question_id)
);

-- Student test attempts
CREATE TABLE IF NOT EXISTS test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES coding_tests(id) NOT NULL,
  student_id uuid REFERENCES profiles(id) NOT NULL,
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  auto_submitted boolean DEFAULT false,
  time_spent_seconds integer DEFAULT 0,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  total_score decimal(5,2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(test_id, student_id)
);

-- Student answers for each question
CREATE TABLE IF NOT EXISTS test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id uuid REFERENCES java_questions(id) NOT NULL,
  answer_code text,
  scores jsonb,
  feedback jsonb,
  question_score decimal(4,2),
  last_saved_at timestamptz DEFAULT now(),
  graded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

-- Code history tracking (for analysis)
CREATE TABLE IF NOT EXISTS answer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid REFERENCES test_answers(id) ON DELETE CASCADE,
  code_snapshot text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  keystroke_count integer DEFAULT 0
);

-- RLS Policies
ALTER TABLE coding_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Teachers can manage their tests" ON coding_tests 
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Students can view active tests" ON coding_tests 
  FOR SELECT USING (status = 'active' AND now() BETWEEN COALESCE(start_date, now()) AND end_date);

CREATE POLICY "Teachers can view their test questions" ON test_questions 
  FOR SELECT USING (EXISTS (SELECT 1 FROM coding_tests WHERE id = test_id AND created_by = auth.uid()));

CREATE POLICY "Students can view questions for their active tests" ON test_questions 
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM coding_tests ct 
    JOIN test_attempts ta ON ct.id = ta.test_id 
    WHERE ct.id = test_id AND ta.student_id = auth.uid() AND ct.status = 'active'
  ));

CREATE POLICY "Students can manage their own attempts" ON test_attempts 
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view attempts for their tests" ON test_attempts 
  FOR SELECT USING (EXISTS (SELECT 1 FROM coding_tests WHERE id = test_id AND created_by = auth.uid()));

CREATE POLICY "Students can manage their own answers" ON test_answers 
  FOR ALL USING (EXISTS (SELECT 1 FROM test_attempts WHERE id = attempt_id AND student_id = auth.uid()));

CREATE POLICY "Teachers can view answers for their tests" ON test_answers 
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM test_attempts ta 
    JOIN coding_tests ct ON ta.test_id = ct.id 
    WHERE ta.id = attempt_id AND ct.created_by = auth.uid()
  ));
```

## Technical Implementation Details

### Required Dependencies
Install these additional packages:
```bash
npm install codemirror @codemirror/lang-java @codemirror/theme-one-dark @codemirror/view @codemirror/state @codemirror/basic-setup
```

### Key Components to Build

**1. Test Creation Interface (`/teacher/tests/create`)**
- Question bank selection with search/filter
- Time limit setting (dropdown: 30min, 1hr, 2hr, custom)
- Test settings toggles (fullscreen, copy-paste, immediate feedback)
- Schedule controls (immediate vs scheduled release)
- Preview functionality

**2. Teacher Test Dashboard (`/teacher/tests/[testId]`)**
- Real-time student progress monitoring
- Live status updates (WebSocket or polling every 30 seconds)
- Quick stats: started/completed/time remaining
- Bulk grading interface with Claude AI integration

**3. Student Test Interface (`/student/test/[testId]`)**
- CodeMirror 6 editor with Java syntax highlighting
- Question sidebar with progress indicators
- Prominent timer with auto-submit countdown
- Font size controls (+/- buttons)
- Auto-save implementation (debounced, every 10 seconds)
- Navigation between questions
- Optional fullscreen mode with security restrictions

**4. Auto-save Implementation**
```typescript
// Efficient auto-save strategy
const autoSave = debounce(async (code: string, questionId: string) => {
  await fetch('/api/test/save-answer', {
    method: 'POST',
    body: JSON.stringify({ code, questionId, timestamp: new Date() })
  })
}, 10000) // 10 second delay
```

### Security Features
- Fullscreen API implementation with exit detection
- Copy-paste event blocking when enabled
- Right-click context menu disabling
- Tab/window switch detection and warnings
- Session validation to prevent concurrent logins

### Real-time Features
Implement using one of:
- Supabase real-time subscriptions for test attempts table
- Polling every 30 seconds for teacher dashboard updates
- WebSocket connection for live progress updates

### API Endpoints to Create

```typescript
// Test management
POST /api/tests/create
GET /api/tests/[testId]
PUT /api/tests/[testId]/publish
GET /api/tests/[testId]/progress // Real-time progress for teachers

// Student test taking
POST /api/tests/[testId]/start // Create test attempt
POST /api/tests/[testId]/save-answer // Auto-save functionality
POST /api/tests/[testId]/submit // Manual or auto submit
GET /api/tests/[testId]/questions // Get test questions for student

// Grading
POST /api/tests/[testId]/grade-all // Bulk grading with Claude AI
GET /api/tests/[testId]/results // Graded results for teacher
```

## UI/UX Design Patterns

### Follow Existing Design System
- Use same color scheme and components as existing grading system
- Consistent navigation and layout patterns
- Responsive design for tablets (test-taking devices)
- Clear visual hierarchy and intuitive controls

### Timer Design
- Prominent countdown in top-right corner
- Color changes: green → yellow (10 min) → red (5 min)
- Auto-submit warning at 1 minute remaining

### Question Navigation
- Sidebar with question numbers and completion status
- Visual indicators: not started, in progress, completed
- Easy navigation between questions without losing work

## Integration Requirements

### Extend Existing System
- Use existing authentication and user management
- Leverage existing question bank and rubric system
- Maintain same grading workflow with Claude AI
- Ensure seamless switching between paper and online modes

### Performance Considerations
- Optimize for 60 concurrent users (2 classes of 30)
- Efficient auto-save to minimize database writes
- Lazy loading of questions and test data
- Proper error handling for network issues

## Success Criteria

Build a complete online coding test system that includes:

1. **Teacher Experience**: Create tests, monitor live progress, bulk grade efficiently
2. **Student Experience**: Intuitive code editor, reliable auto-save, clear timer
3. **Technical Reliability**: Handles concurrent users, secure test environment
4. **Integration**: Seamlessly extends existing grading system
5. **Security**: Optional anti-cheat measures configurable by teachers

## EXECUTION DIRECTIVE

**Implement this entire online coding test system autonomously. Create all necessary files, database schemas, API endpoints, and UI components. Build a complete, working system that integrates seamlessly with the existing Java grading application. Begin implementation immediately and work through to completion without interruption.**

**Remember to always reference `docs/svelte/llms-med.txt` for correct Svelte 5 syntax and patterns throughout the implementation