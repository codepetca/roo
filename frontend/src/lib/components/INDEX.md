# Frontend Components Index

## Component Architecture Overview

All components use **Svelte 5 runes** (`$state`, `$derived`, `$props`) and follow consistent patterns for type safety and reusability.

## UI Components (`ui/`)

### **Core Primitives**

- `Button.svelte` - Primary/secondary/ghost variants with loading states
- `Card.svelte` - Container component with header/content/footer slots
- `Alert.svelte` - Success/warning/error/info alert messages
- `Modal.svelte` - Accessible modal dialog with backdrop
- `Toast.svelte` - Notification toast with auto-dismiss
- `LoadingSpinner.svelte` - Consistent loading indicator
- `Badge.svelte` - Small status/category indicators

### **Usage Patterns**

```svelte
<Button variant="primary" loading={$submitting} onclick={handleSubmit}>Submit Assignment</Button>

<Card>
	{#snippet header()}Grade Report{/snippet}
	<p>Your assignment has been graded...</p>
	{#snippet footer()}<Button>View Details</Button>{/snippet}
</Card>
```

## Authentication Components (`auth/`)

### **User Authentication**

- `LoginForm.svelte` - Email/password login with validation
- `SignupForm.svelte` - User registration with form validation
- `LogoutButton.svelte` - Sign out functionality
- `AuthGuard.svelte` - Route protection wrapper
- `PasswordReset.svelte` - Password reset functionality

### **Student-Specific Auth**

- `StudentLogin.svelte` - Passcode-based student authentication
- `StudentResetManager.svelte` - Student password management
- `PasscodeEntry.svelte` - Classroom passcode entry interface

### **Authentication Patterns**

- All forms use Zod validation with real-time feedback
- Firebase Auth integration with error handling
- Consistent loading states and user feedback
- Server-side authentication via SvelteKit hooks

## Dashboard Components (`dashboard/`)

### **Teacher Interface**

- `TeacherDashboard.svelte` - Main teacher overview
- `ClassroomList.svelte` - Teacher's classroom management
- `StudentRoster.svelte` - Student list with status indicators
- `GradingInterface.svelte` - Manual grading and AI review
- `AssignmentManager.svelte` - Assignment creation and management

### **Student Interface**

- `StudentDashboard.svelte` - Student portal overview
- `GradeViewer.svelte` - Grade display with AI feedback
- `AssignmentHistory.svelte` - Student's assignment history

### **Dashboard Patterns**

- Real-time data updates using Svelte stores
- Responsive design with TailwindCSS
- Loading states for async operations
- Error boundaries for graceful failure handling

## Component Development Patterns

### **Svelte 5 Runes Usage**

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		children: Snippet;
		actions?: Snippet;
	}

	let { title, children, actions }: Props = $props();
	let isExpanded = $state(false);
	let shouldShowActions = $derived(actions && isExpanded);
</script>
```

### **Type Safety**

- All props interface-typed with TypeScript
- Shared types imported from `@shared/types`
- Zod validation for form inputs
- Runtime validation for API responses

### **Styling Consistency**

- TailwindCSS utility classes
- Consistent spacing and color schemes
- Responsive design patterns
- Dark mode support (planned)

## Testing Strategy

### **Component Testing**

- Each component has adjacent `.test.ts` file
- Uses `vitest-browser-svelte` for testing
- Mocked dependencies for isolation
- User interaction testing with realistic scenarios

### **Test Patterns**

```typescript
import { render } from 'vitest-browser-svelte';
import Button from './Button.svelte';

test('Button renders with correct variant', async () => {
	const { getByRole } = render(Button, {
		props: { variant: 'primary', children: 'Click me' }
	});

	expect(getByRole('button')).toHaveClass('btn-primary');
});
```

## Development Workflow

### **Creating New Components**

1. Create component file in appropriate directory
2. Add TypeScript interfaces for props
3. Use Svelte 5 runes for state management
4. Add adjacent test file
5. Export from category `index.ts`

### **Component Documentation**

- JSDoc comments for complex components
- Usage examples in component headers
- Props documentation with types and defaults

## Integration Patterns

### **API Integration**

- Components use reactive stores for data
- Loading states managed with `$state` runes
- Error handling with user-friendly messages
- Optimistic updates where appropriate

### **Authentication Integration**

- Auth components integrate with `$authStore`
- Protected routes use `AuthGuard` wrapper
- User roles determine component visibility
- Session management handled automatically

## Priority Improvements

### **Immediate**

1. **Add JSDoc headers** to complex components
2. **Standardize loading states** across all components
3. **Improve error boundaries** for better user experience

### **High Priority**

1. **Component library documentation** with usage examples
2. **Accessibility improvements** (ARIA labels, keyboard navigation)
3. **Performance optimization** for large lists and forms

### **Future Enhancements**

1. **Storybook integration** for component development
2. **Visual regression testing** for UI consistency
3. **Theme system** for customizable styling
