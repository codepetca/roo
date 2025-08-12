# Svelte 5 Development Guide for Roo

This guide provides Svelte 5 patterns and best practices specifically for the Roo project. All frontend development must use Svelte 5 runes - Svelte 4 patterns are prohibited.

## 🎯 Mandatory Svelte 5 Patterns

### Reactive State with $state()

Use `$state()` for all reactive state management:

```svelte
<script>
  // ✅ Correct - Svelte 5 runes
  let count = $state(0);
  let user = $state(null);
  let assignments = $state([]);

  // ❌ Wrong - Svelte 4 patterns
  // let count = 0;
  // let user;
</script>

<button onclick={() => count++}>
  Count: {count}
</button>
```

### Computed Values with $derived()

Use `$derived()` for computed values:

```svelte
<script>
  let assignments = $state([]);
  
  // ✅ Computed values update automatically
  let completedCount = $derived(
    assignments.filter(a => a.completed).length
  );
  
  let progress = $derived(
    assignments.length > 0 ? (completedCount / assignments.length) * 100 : 0
  );
</script>

<p>Progress: {progress.toFixed(1)}%</p>
```

### Component Props with $props()

Always use `$props()` with destructuring:

```svelte
<script>
  // ✅ Correct - Svelte 5 props with defaults
  let { 
    assignment, 
    editable = false, 
    onUpdate = () => {} 
  } = $props();
  
  // Derived values from props
  let isOverdue = $derived(
    assignment && new Date(assignment.dueDate) < new Date()
  );
</script>

<div class="assignment-card" class:overdue={isOverdue}>
  <h3>{assignment.title}</h3>
  {#if editable}
    <button onclick={() => onUpdate(assignment)}>Edit</button>
  {/if}
</div>
```

### Side Effects with $effect()

Use `$effect()` for side effects and cleanup:

```svelte
<script>
  let user = $state(null);
  let notifications = $state([]);
  
  // ✅ Effect for API calls and subscriptions
  $effect(() => {
    if (user?.id) {
      const unsubscribe = subscribeToNotifications(user.id, (data) => {
        notifications = data;
      });
      
      // Cleanup function
      return () => unsubscribe();
    }
  });
  
  // ✅ Effect for DOM interactions
  $effect(() => {
    if (notifications.length > 0) {
      document.title = `Roo (${notifications.length})`;
    } else {
      document.title = 'Roo';
    }
  });
</script>
```

## 🧩 Snippets Pattern (MANDATORY)

Replace Svelte 4 slots with Svelte 5 snippets:

```svelte
<!-- Card.svelte -->
<script>
  let { children, actions, className = '' } = $props();
</script>

<div class="card {className}">
  <div class="card-content">
    {@render children?.()}
  </div>
  
  {#if actions}
    <div class="card-actions">
      {@render actions()}
    </div>
  {/if}
</div>

<!-- Usage -->
<Card className="assignment-card">
  {#snippet children()}
    <h3>Assignment Title</h3>
    <p>Assignment description here...</p>
  {/snippet}
  
  {#snippet actions()}
    <button>Edit</button>
    <button>Delete</button>
  {/snippet}
</Card>
```

## 📊 State Management Patterns

### Store Pattern with $state

Create reactive stores using `$state`:

```typescript
// lib/stores/auth.svelte.ts
import type { User } from '@shared/types';

class AuthStore {
  user = $state<User | null>(null);
  loading = $state(false);
  
  // Derived values
  isAuthenticated = $derived(this.user !== null);
  isTeacher = $derived(this.user?.role === 'teacher');
  
  async login(credentials: LoginCredentials) {
    this.loading = true;
    try {
      this.user = await api.login(credentials);
    } finally {
      this.loading = false;
    }
  }
  
  logout() {
    this.user = null;
  }
}

export const authStore = new AuthStore();
```

### Component Usage

```svelte
<script>
  import { authStore } from '$lib/stores/auth.svelte.js';
  
  // Access reactive state directly
  let user = $derived(authStore.user);
  let isAuthenticated = $derived(authStore.isAuthenticated);
</script>

{#if isAuthenticated}
  <p>Welcome, {user.name}!</p>
  <button onclick={() => authStore.logout()}>Logout</button>
{:else}
  <LoginForm onLogin={(creds) => authStore.login(creds)} />
{/if}
```

## 🎨 Component Architecture

### Base Component Structure

```svelte
<!-- AssignmentCard.svelte -->
<script>
  import type { Assignment } from '@shared/types';
  import { Badge, Button } from '$lib/components/ui';
  
  let { 
    assignment,
    onEdit = () => {},
    onDelete = () => {},
    showActions = true 
  }: {
    assignment: Assignment;
    onEdit?: (assignment: Assignment) => void;
    onDelete?: (assignment: Assignment) => void;
    showActions?: boolean;
  } = $props();
  
  let isOverdue = $derived(
    new Date(assignment.dueDate) < new Date()
  );
  
  let statusColor = $derived(() => {
    if (isOverdue) return 'red';
    if (assignment.status === 'completed') return 'green';
    return 'blue';
  });
</script>

<div class="assignment-card" class:overdue={isOverdue}>
  <div class="assignment-header">
    <h3>{assignment.title}</h3>
    <Badge color={statusColor}>{assignment.status}</Badge>
  </div>
  
  <p class="assignment-description">{assignment.description}</p>
  
  {#if showActions}
    <div class="assignment-actions">
      <Button variant="secondary" onclick={() => onEdit(assignment)}>
        Edit
      </Button>
      <Button variant="danger" onclick={() => onDelete(assignment)}>
        Delete
      </Button>
    </div>
  {/if}
</div>

<style>
  .assignment-card {
    @apply p-4 border rounded-lg shadow-sm;
  }
  
  .assignment-card.overdue {
    @apply border-red-500 bg-red-50;
  }
  
  .assignment-header {
    @apply flex justify-between items-center mb-2;
  }
  
  .assignment-actions {
    @apply flex gap-2 mt-4;
  }
</style>
```

## 🔄 Form Handling

### Reactive Form with Validation

```svelte
<script>
  import { z } from 'zod';
  
  const assignmentSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    dueDate: z.string().refine(date => new Date(date) > new Date(), 'Due date must be in the future')
  });
  
  let formData = $state({
    title: '',
    description: '',
    dueDate: ''
  });
  
  let errors = $state({});
  let isSubmitting = $state(false);
  
  // Real-time validation
  let isValid = $derived(() => {
    const result = assignmentSchema.safeParse(formData);
    errors = result.success ? {} : result.error.flatten().fieldErrors;
    return result.success;
  });
  
  async function handleSubmit(event) {
    event.preventDefault();
    
    if (!isValid) return;
    
    isSubmitting = true;
    try {
      await api.createAssignment(formData);
      // Reset form
      formData = { title: '', description: '', dueDate: '' };
    } catch (error) {
      console.error('Failed to create assignment:', error);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <div class="form-group">
    <label for="title">Title</label>
    <input
      id="title"
      type="text"
      bind:value={formData.title}
      class:error={errors.title}
    />
    {#if errors.title}
      <span class="error-message">{errors.title[0]}</span>
    {/if}
  </div>
  
  <div class="form-group">
    <label for="description">Description</label>
    <textarea
      id="description"
      bind:value={formData.description}
      class:error={errors.description}
    ></textarea>
    {#if errors.description}
      <span class="error-message">{errors.description[0]}</span>
    {/if}
  </div>
  
  <div class="form-group">
    <label for="dueDate">Due Date</label>
    <input
      id="dueDate"
      type="datetime-local"
      bind:value={formData.dueDate}
      class:error={errors.dueDate}
    />
    {#if errors.dueDate}
      <span class="error-message">{errors.dueDate[0]}</span>
    {/if}
  </div>
  
  <button
    type="submit"
    disabled={!isValid || isSubmitting}
    class="submit-button"
  >
    {isSubmitting ? 'Creating...' : 'Create Assignment'}
  </button>
</form>
```

## 🛣️ SvelteKit Integration

### Page Components with Load Functions

```typescript
// src/routes/dashboard/assignments/+page.ts
import type { PageLoad } from './$types';
import { api } from '$lib/api';

export const load: PageLoad = async ({ url, depends }) => {
  depends('assignments:list');
  
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = 20;
  
  try {
    const assignments = await api.getAssignments({ page, limit });
    
    return {
      assignments,
      pagination: {
        page,
        limit,
        total: assignments.length
      }
    };
  } catch (error) {
    return {
      assignments: [],
      error: 'Failed to load assignments'
    };
  }
};
```

```svelte
<!-- src/routes/dashboard/assignments/+page.svelte -->
<script>
  import type { PageData } from './$types';
  import { invalidate } from '$app/navigation';
  import { AssignmentCard, Pagination } from '$lib/components';
  
  let { data }: { data: PageData } = $props();
  
  let assignments = $derived(data.assignments);
  let pagination = $derived(data.pagination);
  
  async function handleDeleteAssignment(assignment) {
    try {
      await api.deleteAssignment(assignment.id);
      // Refresh the data
      await invalidate('assignments:list');
    } catch (error) {
      console.error('Failed to delete assignment:', error);
    }
  }
</script>

<div class="assignments-page">
  <header class="page-header">
    <h1>Assignments</h1>
    <a href="/dashboard/assignments/create" class="btn-primary">
      Create Assignment
    </a>
  </header>
  
  {#if data.error}
    <div class="error-banner">
      {data.error}
    </div>
  {:else if assignments.length === 0}
    <div class="empty-state">
      <p>No assignments found.</p>
    </div>
  {:else}
    <div class="assignments-grid">
      {#each assignments as assignment (assignment.id)}
        <AssignmentCard
          {assignment}
          onDelete={() => handleDeleteAssignment(assignment)}
        />
      {/each}
    </div>
    
    <Pagination {pagination} />
  {/if}
</div>
```

## 🎯 Best Practices Summary

1. **Always use Svelte 5 runes** - `$state()`, `$derived()`, `$props()`, `$effect()`
2. **Use snippets instead of slots** - Replace `<slot>` with `{#snippet}` and `{@render}`
3. **Validate with Zod** - All form data and API responses must be validated
4. **Type everything** - Use TypeScript for all props and state
5. **Keep files small** - Maximum 200 lines per component
6. **Use TailwindCSS** - Follow existing utility-first styling
7. **Handle errors gracefully** - Always provide error states and loading states
8. **Test reactive behavior** - Write tests for state changes and derived values

## 📚 Related Documentation

- [Current Architecture](./development/current-architecture.md) - Overall system design
- [Coding Patterns](./development/coding-patterns.md) - General coding standards
- [Testing Strategy](../testing/testing-strategy.md) - How to test Svelte 5 components

---

*This guide is specific to Roo's Svelte 5 implementation. Always follow these patterns to maintain consistency and leverage the full power of Svelte 5's fine-grained reactivity.*