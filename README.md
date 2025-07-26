# Roo Auto-Grading System

AI-powered auto-grading system for educational assignments using Google Gemini 1.5 Flash.

## Project Structure

```
roo/
├── frontend/           # SvelteKit + Svelte 5 application
├── functions/          # Firebase Functions backend  
├── shared/             # Shared types and utilities
├── docs/               # Living documentation
│   ├── development/    # Technical documentation
│   └── architecture/   # System design docs
├── testing/            # Manual testing scripts
│   └── manual/         # API health check scripts
└── scripts/            # Build and deployment utilities
```

## Quick Start

```bash
# Install all dependencies
npm install

# Start development environment (frontend + emulators)
npm run dev

# Seed test data (first time only)
npm run emulators:seed

# Run all tests
npm run test

# Build everything
npm run build

# Deploy to production
npm run deploy
```

## Key Features

- **AI Grading**: Google Gemini 1.5 Flash with generous grading for handwritten code
- **Type Safety**: Comprehensive Zod validation and shared TypeScript types
- **Real-time**: SvelteKit frontend with Firebase Firestore
- **Integration**: Google Sheets for legacy data management
- **Testing**: Automated tests + manual health check scripts

## Development URLs

- **Frontend**: http://localhost:5173
- **API**: http://localhost:5001/roo-app-3d24e/us-central1/api
- **Emulator UI**: http://localhost:4000 (Firebase debugging)

## Documentation

- **[AI Collaboration Guide](docs/development/ai-collaboration-guide.md)** - Working with Claude Code
- **[Current Architecture](docs/development/current-architecture.md)** - System overview
- **[Testing Strategy](testing/README.md)** - Manual and automated testing

## Technology Stack

- **Frontend**: SvelteKit + Svelte 5 + TypeScript + TailwindCSS
- **Backend**: Firebase Functions + TypeScript + Zod
- **Database**: Firestore + Google Sheets
- **AI**: Google Gemini 1.5 Flash
- **Testing**: Vitest + manual scripts

## Workspace Commands

```bash
# Development
npm run dev              # Start frontend + emulators
npm run emulators        # Start emulators only
npm run emulators:seed   # Populate test data

# Quality
npm run quality:check    # Lint + type check everything  
npm run test             # Run all automated tests
npm run test:manual      # Run manual API health checks

# Build & Deploy
npm run build            # Build all components
npm run deploy           # Deploy to Firebase
```

## Getting Help

- **Issues**: Check `docs/development/troubleshooting.md`
- **Architecture**: See `docs/development/current-architecture.md`
- **API**: Manual test scripts in `testing/manual/`

---

**Built with ❤️ for educational technology**