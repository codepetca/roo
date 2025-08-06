# Frontend Library Index

## Core Modules

### **API & External Services**

- `api.ts` (11 lines) - **REFACTORED** Clean re-export from modular structure
  - **Successfully split**: api/client.ts + api/endpoints.ts + api/index.ts
  - 98.5% size reduction with maintained functionality
  - Primary interface for all backend communication

### **Firebase Integration**

- `firebase.ts` (90 lines) - Firebase initialization and auth setup
  - Client-side Firebase configuration
  - Authentication state management
  - Environment-aware initialization

### **Type Safety & Validation**

- `schemas.ts` (250 lines) - Frontend Zod schemas and validators
  - Form validation schemas
  - API response validation
  - Imports from `@shared/types` for consistency

## Component Architecture

### **UI Components** (`components/ui/`)

- Reusable design system primitives
- 7 components: Button, Card, Alert, Modal, Toast, LoadingSpinner, Badge
- All use Svelte 5 runes pattern (`$state`, `$props`)

### **Authentication** (`components/auth/`)

- 8 auth-related components
- LoginForm, SignupForm, LogoutButton, AuthGuard, etc.
- Integrated with Firebase Auth

### **Dashboard Components** (`components/dashboard/`)

- 7 dashboard-specific components
- Teacher-focused interface components
- Student management and grading interfaces

## Stores & State Management

### **Svelte 5 State** (`stores/`)

- `auth.svelte.ts` - Authentication state with runes
- `auth.ts` - Legacy store (being migrated to runes)
- Uses `$state`, `$derived`, `$props` patterns

## Key Development Patterns

### **API Integration**

- All API calls use `typedApiRequest` with Zod validation
- Runtime response validation prevents type mismatches
- Comprehensive error handling with user-friendly messages

### **Component Patterns**

- Svelte 5 runes for all new components
- Shared types from `@shared/types`
- TailwindCSS for styling consistency

### **Authentication Flow**

- Server-side auth via SvelteKit hooks
- Firebase Auth integration
- Role-based access control (teacher/student)

## Quick Navigation Commands

```bash
# Start development
npm run dev

# Test frontend only
npm run test:frontend

# Type checking
npm run type-check:frontend

# Linting
npm run lint:frontend
```

## Optimization Results ✅

1. **Split api.ts**: ✅ **COMPLETED** - 648 lines → 11 lines + focused modules
2. **Directory navigation**: ✅ **COMPLETED** - INDEX.md files for instant context
3. **Enhanced file headers**: ✅ **COMPLETED** - Module metadata on key files

## Remaining Improvements

1. **Component documentation**: Add JSDoc headers to complex components
2. **Store migration**: Complete migration from legacy stores to Svelte 5 runes
3. **Type cleanup**: Remove remaining `any` types in auth components
