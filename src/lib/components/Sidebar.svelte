<script lang="ts">
  import { page } from '$app/stores'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { goto } from '$app/navigation'
  import Icon from './Icon.svelte'

  let { 
    isOpen = false,
    onClose = () => {}
  } = $props()

  interface NavItem {
    label: string
    href: string
    icon: string
    roles: string[]
  }

  const navigationItems: NavItem[] = [
    { label: 'Dashboard', href: '/teacher', icon: 'home', roles: ['teacher'] },
    { label: 'Tests', href: '/teacher/tests', icon: 'document-text', roles: ['teacher'] },
    { label: 'Archive', href: '/teacher/archive', icon: 'archive-box', roles: ['teacher'] },
    { label: 'Create Test', href: '/teacher/tests/create', icon: 'plus', roles: ['teacher'] },
    { label: 'Students', href: '/admin/students', icon: 'users', roles: ['teacher', 'admin'] },
    { label: 'Classes', href: '/admin/classes', icon: 'building-office', roles: ['teacher', 'admin'] },
    { label: 'Admin Dashboard', href: '/admin', icon: 'cog-6-tooth', roles: ['admin'] },
    { label: 'Cleanup', href: '/admin/cleanup', icon: 'trash', roles: ['admin'] },
    { label: 'Dashboard', href: '/student', icon: 'home', roles: ['student'] }
  ]

  const bottomNavItems: NavItem[] = [
    { label: 'Profile', href: '/profile', icon: 'user', roles: ['teacher', 'admin', 'student'] },
    { label: 'Settings', href: '/settings', icon: 'cog-6-tooth', roles: ['teacher', 'admin', 'student'] }
  ]

  function getVisibleNavItems(items: NavItem[], userRole: string | undefined): NavItem[] {
    if (!userRole) return []
    return items.filter(item => item.roles.includes(userRole))
  }

  function isActiveRoute(href: string, currentPath: string): boolean {
    if (href === '/teacher' || href === '/student' || href === '/admin') {
      return currentPath === href
    }
    return currentPath.startsWith(href)
  }

  async function handleSignOut() {
    await authStore.signOut()
    goto('/')
  }

  function closeSidebar() {
    onClose()
  }

  // Close sidebar when clicking outside on mobile
  function handleBackdropClick() {
    if (isOpen) {
      closeSidebar()
    }
  }

  const currentPath = $derived($page.url.pathname)
  const userRole = $derived(authStore.profile?.role)
  const visibleNavItems = $derived(getVisibleNavItems(navigationItems, userRole))
  const visibleBottomItems = $derived(getVisibleNavItems(bottomNavItems, userRole))
</script>

<!-- Mobile backdrop -->
{#if isOpen}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === 'Escape' && closeSidebar()}
    role="button"
    tabindex="0"
    aria-label="Close sidebar"
  ></div>
{/if}

<!-- Sidebar -->
<aside 
  class="fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-transform duration-300 ease-in-out {isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto"
  class:w-64={true}
>
  <!-- Header -->
  <div class="flex items-center justify-between p-6 border-b border-gray-100">
    <h1 class="text-xl font-semibold text-gray-900">Codegrade</h1>
    <button 
      onclick={closeSidebar}
      class="lg:hidden p-1 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label="Close sidebar"
    >
      <Icon name="x-mark" size="sm" color="muted" />
    </button>
  </div>

  <!-- User info -->
  {#if authStore.profile}
    <div class="px-6 py-4 border-b border-gray-100">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <span class="text-sm font-medium text-gray-700">
            {authStore.profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            {authStore.profile.full_name || 'User'}
          </p>
          <p class="text-xs text-gray-500 capitalize">
            {authStore.profile.role}
          </p>
        </div>
      </div>
      
      <!-- Status indicators -->
      {#if !authStore.isEmailVerified}
        <div class="mt-3 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
          Email verification required
        </div>
      {:else if authStore.isTeacherPending}
        <div class="mt-3 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded-md">
          Approval pending
        </div>
      {/if}
    </div>
  {/if}

  <!-- Navigation -->
  <nav class="flex-1 px-4 py-4 space-y-1">
    {#each visibleNavItems as item}
      <a
        href={item.href}
        onclick={closeSidebar}
        class="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group
          {isActiveRoute(item.href, currentPath) 
            ? 'bg-gray-900 text-white' 
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }"
      >
        <Icon 
          name={item.icon} 
          size="md" 
          color={isActiveRoute(item.href, currentPath) ? 'active' : 'default'}
          class="mr-3 transition-colors {isActiveRoute(item.href, currentPath) ? 'text-white' : 'group-hover:text-gray-900'}"
        />
        {item.label}
      </a>
    {/each}
  </nav>

  <!-- Bottom navigation -->
  <div class="border-t border-gray-100 px-4 py-4 space-y-1">
    {#each visibleBottomItems as item}
      <a
        href={item.href}
        onclick={closeSidebar}
        class="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group
          {isActiveRoute(item.href, currentPath) 
            ? 'bg-gray-900 text-white' 
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }"
      >
        <Icon 
          name={item.icon} 
          size="md" 
          color={isActiveRoute(item.href, currentPath) ? 'active' : 'default'}
          class="mr-3 transition-colors {isActiveRoute(item.href, currentPath) ? 'text-white' : 'group-hover:text-gray-900'}"
        />
        {item.label}
      </a>
    {/each}
    
    <!-- Sign out -->
    <button
      onclick={handleSignOut}
      class="flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg transition-all duration-200 hover:bg-gray-50 hover:text-gray-900 group"
    >
      <Icon 
        name="arrow-right-on-rectangle" 
        size="md" 
        color="default"
        class="mr-3 group-hover:text-gray-900"
      />
      Sign Out
    </button>
  </div>
</aside>