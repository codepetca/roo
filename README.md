# Codegrade

An AI-powered web application for grading handwritten Java code submissions from high school students (grades 9-12) in Ontario. Built with SvelteKit, Supabase, and Claude AI.

## 🚀 Features

### For Teachers
- **Question Generation**: Create Java coding questions using AI with customizable concepts
- **Image Upload & OCR**: Upload photos of handwritten student code
- **AI-Powered Grading**: Get detailed feedback across three rubric categories:
  - Communication (25%): Code formatting, indentation, clarity
  - Correctness (50%): Syntax accuracy, Java conventions
  - Logic (25%): Problem-solving approach, algorithm correctness
- **Question Bank**: View and manage generated questions
- **Submission History**: Track all graded submissions

### For Students  
- **View Submissions**: See all your graded work
- **Detailed Feedback**: Get specific feedback for each rubric category
- **Code Extraction**: See how AI interpreted your handwritten code
- **Progress Tracking**: Monitor your improvement over time

## 🛠 Tech Stack

- **Frontend**: SvelteKit with Svelte 5 (using runes)
- **Backend**: TypeScript API routes
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI**: Claude 3.5 Sonnet for question generation and code grading
- **Storage**: Supabase Storage for uploaded images
- **Styling**: TailwindCSS

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Anthropic API key for Claude AI

## 🔧 Setup Instructions

### 1. Environment Configuration

The application uses environment variables stored in `.env.local`:

```env
# Anthropic Claude AI
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=your_supabase_project_url  
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Database Setup

The database tables are already created in the Codegrade Supabase project:
- `profiles` - User profiles with roles (teacher/student)
- `java_questions` - Generated coding questions with rubrics
- `java_submissions` - Student submissions and grades
- Storage bucket: `java-submission-images` for uploaded images

### 3. Install Dependencies

```bash
npm install
```

### 4. Development

```bash
# Start development server
npm run dev

# Open in browser
npm run dev -- --open
```

### 5. Building for Production

```bash
npm run build
npm run preview
```

## 🎯 Usage Guide

### For Teachers

1. **Sign Up**: Create a teacher account at `/auth/signup`
2. **Generate Questions**: 
   - Select Java concepts (variables, loops, conditionals, etc.)
   - Click "Generate Question" to create AI-powered questions
3. **Grade Submissions**:
   - Select a question from your question bank
   - Upload a photo of student's handwritten code
   - Get instant AI grading with detailed feedback
4. **View Results**: See extracted code, scores, and detailed feedback

### For Students

1. **Sign Up**: Create a student account at `/auth/signup` 
2. **View Submissions**: Access `/student` to see all your graded work
3. **Review Feedback**: Click on any submission to see:
   - Original question
   - Your extracted code
   - Scores for each rubric category
   - Detailed feedback and suggestions

## 📁 Project Structure

```
src/
├── lib/
│   ├── server/          # Server-side utilities
│   │   ├── supabase.ts  # Server Supabase client
│   │   └── claude.ts    # Claude AI integration
│   ├── types/           # TypeScript definitions
│   ├── stores/          # Svelte stores
│   └── components/      # Reusable components
├── routes/
│   ├── auth/           # Authentication pages
│   ├── teacher/        # Teacher dashboard
│   ├── student/        # Student dashboard
│   └── api/           # API endpoints
├── app.css            # Global styles
└── app.html          # HTML template
```

## 🔐 Security Features

- **Row Level Security (RLS)** on all database tables
- **Role-based access control** (teacher/student)
- **Image upload validation** (type, size limits)
- **Authenticated API routes**
- **Environment variable protection**

## 🧪 Java Concepts Supported

The application focuses on CodeHS Java Unit 1 fundamentals:
- Variables and data types (int, double, String, boolean)
- Basic arithmetic operations
- System.out.println() and output formatting
- Scanner for user input
- Basic conditionals (if/else)
- Simple loops (for, while)
- String operations
- Basic class structure and main method

## 🚨 Important Notes

- **Image Format**: Supports JPG, PNG, HEIC (max 10MB)
- **Handwriting**: Works best with clear, legible handwriting
- **Demo Mode**: Teachers can test with demo student IDs
- **Authentication**: Email verification required for new accounts

## 🔧 Development Features

- **Hot Module Replacement** for fast development
- **TypeScript** for type safety
- **ESLint & Prettier** for code quality
- **Svelte 5 runes** for reactive state management
- **Responsive design** with TailwindCSS

## 📊 Sample Questions Available

The application comes with sample questions including:
1. User input and greeting program
2. Rectangle area calculation
3. And more generated via AI

## 🤝 Contributing

This is an MVP built for educational purposes. Key areas for expansion:
- More Java concept support
- Advanced rubric customization
- Batch grading capabilities
- Analytics and reporting
- Mobile app companion

## 📝 License

Educational use project - built as a demonstration of AI-powered educational tools.

---

Built with ❤️ using SvelteKit, Supabase, and Claude AI
