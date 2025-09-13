# CodeHS Quiz Generator

An AI-powered Google Apps Script web application that automatically generates Google Form quizzes for CodeHS programming units using Google Gemini Flash.

## Features

- 🎓 **CodeHS Integration**: Built-in curriculum data for Programming with Karel unit
- 🤖 **AI-Generated Questions**: Uses Google Gemini Flash to create contextual quiz questions
- 📝 **Mixed Question Types**: Combines coding challenges with multiple choice questions
- 📊 **Progressive Difficulty**: Questions scale from beginner to advanced levels
- 🚀 **One-Click Generation**: Complete quiz creation with minimal user input
- ✅ **Auto-Grading**: Multiple choice questions graded automatically by Google Forms

## Project Structure

```
├── Code.gs                # Main application logic and orchestration
├── ai-service.gs          # Gemini Flash AI integration
├── forms-service.gs       # Google Forms API wrapper
├── syllabus-data.gs       # CodeHS curriculum data and structure
├── ui.html               # Frontend web interface
├── appsscript.json       # Project configuration and OAuth scopes
└── README.md             # This file
```

## Setup Instructions

### 1. Environment Configuration (Recommended)

**🎯 New: Automated Environment Management**

This project now supports automatic API key deployment from a local `.env` file.

#### **Quick Setup:**

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env file with your API key
# GEMINI_API_KEY=your-actual-api-key-here

# 3. Deploy with environment
npm run deploy:full
```

#### **Step-by-Step Setup:**

1. **Get Gemini API Key:**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Click "Create API key"
   - Copy the API key (starts with "AIza...")

2. **Configure Environment:**
   ```bash
   # Create .env from template
   cp .env.example .env
   
   # Edit .env file - replace 'your-gemini-api-key-here' with actual key
   nano .env  # or use your preferred editor
   ```

3. **Deploy Everything:**
   ```bash
   # Deploy code and environment in one command
   npm run deploy:full
   ```

4. **Complete Setup in Apps Script:**
   - Open Apps Script editor: `npm run open`
   - Run the `deployEnvironmentVariables()` function (auto-generated)
   - Run the `verifyEnvironmentSetup()` function to confirm
   - Your API key is now securely stored in Script Properties!

### 2. Manual Setup (Alternative)

If you prefer the original manual setup:

1. Open the Apps Script editor
2. Run the `setupGeminiAPIKey()` function  
3. Enter your Google Gemini API key when prompted
4. The key will be stored securely in script properties

### 3. Deploy the Application

**Current Deployment:**

```bash
# Project Name: Quiz Generator
# Project URL
https://script.google.com/d/1_Ai3lyznrYrMTQ9gdNbdws6VAtCh4VWzpFQPEuW1oH9SIbL1qheBmz7K/edit

# Webapp URL
https://script.google.com/macros/s/AKfycbw0ziNv3e0rLZjJu0-7fwxvjb87sPpinUgH0I7C-JovSCEoLaCXq-mzS2om81mTIEwhIw/exec

# Deployment ID
AKfycbw0ziNv3e0rLZjJu0-7fwxvjb87sPpinUgH0I7C-JovSCEoLaCXq-mzS2om81mTIEwhIw
```

### 3. Test the System

Run the `runSystemTest()` function to verify all services are working:
- ✅ Syllabus data loading
- ✅ AI service configuration 
- ✅ Forms API access

### 4. Access the Web Application

The web app is deployed and accessible via the deployment URL. Users can:
1. Select a CodeHS unit from the dropdown
2. Configure the number of coding and multiple choice questions
3. Optionally customize the quiz title and description
4. Generate the quiz with one click
5. Access the created Google Form via provided links

## Usage Workflow

### For Instructors:

1. **Select Unit**: Choose from available CodeHS units (currently Programming with Karel)
2. **Configure Quiz**: Set the number of coding questions (1-10) and multiple choice questions (5-50)
3. **Customize**: Optionally provide custom title and description
4. **Generate**: Click "Generate Quiz" and wait for AI processing
5. **Share**: Use the provided links to share the quiz with students or edit it further

### For Students:

Students receive the standard Google Form quiz with:
- **Coding Questions**: Text response fields for Karel programming challenges
- **Multiple Choice**: Auto-graded conceptual questions
- **Progressive Difficulty**: Questions get more challenging throughout the quiz
- **Immediate Feedback**: Multiple choice questions provide instant results

## Technical Architecture

### AI Question Generation Pipeline

1. **Content Analysis**: Extract key concepts from selected CodeHS unit
2. **Prompt Engineering**: Create context-rich prompts for Gemini Flash
3. **AI Processing**: Generate structured JSON with questions and answers
4. **Validation**: Ensure question quality and format compliance
5. **Form Creation**: Convert AI output to Google Forms structure

### Question Types

#### Coding Questions
- Karel robot programming challenges
- Progressive difficulty: Easy → Medium → Hard  
- Sample solution approaches included
- Manual grading required (10 points default)

#### Multiple Choice Questions
- Conceptual understanding of programming fundamentals
- 4 options per question (A, B, C, D)
- Auto-graded with explanations (5 points default)
- Covers functions, loops, conditionals, problem-solving

### OAuth Scopes Required

```json
[
  "https://www.googleapis.com/auth/forms.body",
  "https://www.googleapis.com/auth/forms.responses.readonly", 
  "https://www.googleapis.com/auth/script.external_request",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/script.scriptapp",
  "https://www.googleapis.com/auth/drive"
]
```

## Development Commands

### **Environment-Aware Commands (Recommended):**

```bash
# Setup & Configuration
npm run setup                # Initialize project (copies .env.example)
npm run deploy:env          # Deploy environment variables only
npm run deploy:full         # Deploy environment + code + webapp

# Development 
npm run push                # Push code changes to Apps Script
npm run deploy              # Create new webapp deployment
npm run open                # Open Apps Script editor
npm run open:webapp         # Open deployed webapp

# Testing & Debugging
npm run test:env            # Test environment variable setup
npm run logs                # View Apps Script execution logs
npm run status              # Check deployment status
npm run clean               # Remove temporary files

# Deployment Management
npm run list:deployments    # List all deployments
npm run deploy:new          # Create new deployment with description
```

### **Manual Clasp Commands (Alternative):**

```bash
# Push code changes
clasp push --force

# Deploy new version  
clasp deploy --deploymentId AKfycbw0ziNv3e0rLZjJu0-7fwxvjb87sPpinUgH0I7C-JovSCEoLaCXq-mzS2om81mTIEwhIw --description "Updated quiz generation logic"

# Open in browser
clasp open
```

### **Environment Files:**

```
├── .env                 # Your API keys (gitignored, create from template)
├── .env.example         # Template for environment setup
├── .gitignore           # Excludes sensitive files from git
├── deploy-env.js        # Environment deployment script
└── package.json         # NPM commands and project metadata
```

## Curriculum Support

Currently supports:
- **Programming with Karel** (16 lessons)
  - Basic Karel commands and navigation
  - Functions and top-down design
  - Control structures (loops, conditionals)
  - Problem-solving strategies

### Future Expansion Plans
- Additional CodeHS units (Web Development, Data Structures)
- More programming languages and frameworks
- Advanced AI grading for coding questions
- Analytics and performance tracking

## Troubleshooting

### Common Issues

1. **API Key Not Found**: Run `setupGeminiAPIKey()` function
2. **Permission Denied**: Check OAuth scopes in appsscript.json
3. **AI Generation Fails**: Verify API key and check Gemini quotas
4. **Form Creation Errors**: Ensure Forms API access is enabled

### Debug Functions

- `runSystemTest()`: Comprehensive system health check
- `getAvailableUnits()`: Verify curriculum data loading
- `initializeApp()`: Reset and initialize application state

## Support

For issues or questions:
1. Check the Apps Script execution transcript for detailed error logs
2. Verify all OAuth permissions are granted
3. Ensure Gemini API key is valid and has sufficient quota
4. Test individual components using the provided debug functions

---

**Created**: September 2025  
**Version**: 1.0.0  
**License**: MIT