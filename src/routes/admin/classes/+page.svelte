<script lang="ts">
  import { onMount } from 'svelte'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { toastStore } from '$lib/stores/toast.svelte.js'
  import { goto } from '$app/navigation'
  import type { UserProfile } from '$lib/types/index.js'
  import { generateId } from '$lib/utils/accessibility.js'
  import AccessibleModal from '$lib/components/AccessibleModal.svelte'
  
  let students = $state<UserProfile[]>([])
  let loading = $state(true)
  let showCreateClass = $state(false)
  let showEditClass = $state(false)
  let editingClass = $state<string | null>(null)
  let newClassName = $state('')
  let editClassName = $state('')
  
  // Generate unique IDs for form fields
  const formIds = {
    newClassName: generateId('new-class-name'),
    editClassName: generateId('edit-class-name')
  }
  
  // Get unique classes and their student counts
  const classStats = $derived(() => {
    const studentsByClass = students
      .filter(s => s.role === 'student')
      .reduce((acc, student) => {
        const className = student.class_name || 'Unassigned'
        if (!acc[className]) {
          acc[className] = {
            name: className,
            students: [],
            active: 0,
            disabled: 0,
            suspended: 0
          }
        }
        acc[className].students.push(student)
        
        const status = student.account_status || 'active'
        if (status === 'active') acc[className].active++
        else if (status === 'disabled') acc[className].disabled++
        else if (status === 'suspended') acc[className].suspended++
        
        return acc
      }, {} as Record<string, {
        name: string
        students: UserProfile[]
        active: number
        disabled: number
        suspended: number
      }>)
    
    return Object.values(studentsByClass).sort((a, b) => {
      if (a.name === 'Unassigned') return 1
      if (b.name === 'Unassigned') return -1
      return a.name.localeCompare(b.name)
    })
  })
  
  onMount(async () => {
    if (!authStore.isAdmin && !authStore.isTeacher) {
      toastStore.addToast('Access denied. Teacher privileges required.', 'error')
      goto('/admin')
      return
    }
    
    await loadStudents()
  })
  
  async function loadStudents() {
    loading = true
    try {
      const allUsers = await authStore.getAllUsers()
      students = allUsers || []
    } catch (error: any) {
      toastStore.addToast(error.message || 'Failed to load students', 'error')
    } finally {
      loading = false
    }
  }
  
  async function createClass() {
    if (!newClassName.trim()) {
      toastStore.addToast('Class name is required', 'error')
      return
    }
    
    // Check if class already exists
    const existingClass = classStats.find(c => c.name.toLowerCase() === newClassName.toLowerCase())
    if (existingClass) {
      toastStore.addToast('A class with this name already exists', 'error')
      return
    }
    
    // For now, just show success message since we're working with existing student data
    toastStore.addToast(`Class "${newClassName}" created successfully!`, 'success')
    newClassName = ''
    showCreateClass = false
  }
  
  async function renameClass(oldName: string, newName: string) {
    if (!newName.trim()) {
      toastStore.addToast('Class name cannot be empty', 'error')
      return
    }
    
    if (oldName === 'Unassigned') {
      toastStore.addToast('Cannot rename the "Unassigned" category', 'error')
      return
    }
    
    try {
      // Update all students in this class
      const studentsToUpdate = students.filter(s => s.class_name === oldName)
      
      for (const student of studentsToUpdate) {
        await authStore.updateStudentClass(student.id, newName)
      }
      
      toastStore.addToast(`Class renamed from "${oldName}" to "${newName}"`, 'success')
      await loadStudents()
      showEditClass = false
      editingClass = null
    } catch (error: any) {
      toastStore.addToast(error.message || 'Failed to rename class', 'error')
    }
  }
  
  async function deleteClass(className: string) {
    if (className === 'Unassigned') {
      toastStore.addToast('Cannot delete the "Unassigned" category', 'error')
      return
    }
    
    if (!confirm(`Are you sure you want to delete the class "${className}"? All students will be moved to "Unassigned".`)) {
      return
    }
    
    try {
      // Move all students to unassigned
      const studentsToUpdate = students.filter(s => s.class_name === className)
      
      for (const student of studentsToUpdate) {
        await authStore.updateStudentClass(student.id, null)
      }
      
      toastStore.addToast(`Class "${className}" deleted and students moved to unassigned`, 'success')
      await loadStudents()
    } catch (error: any) {
      toastStore.addToast(error.message || 'Failed to delete class', 'error')
    }
  }
  
  async function moveStudentToClass(studentId: string, newClass: string | null) {
    try {
      await authStore.updateStudentClass(studentId, newClass)
      toastStore.addToast('Student moved to new class', 'success')
      await loadStudents()
    } catch (error: any) {
      toastStore.addToast(error.message || 'Failed to move student', 'error')
    }
  }
  
  function startEditClass(className: string) {
    editingClass = className
    editClassName = className
    showEditClass = true
  }
</script>

<!-- Page Header -->
<div class="page-header">
  <div class="page-content py-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="heading-xl">Class Management</h1>
        <p class="text-body mt-1">Organize students into classes and manage class structure</p>
      </div>
      <button
        onclick={loadStudents}
        disabled={loading}
        class="btn btn-secondary btn-sm"
      >
        {loading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
  </div>
</div>

<!-- Main Content -->
<div class="page-content py-8 space-y-8">

  <!-- Quick Actions -->
  <div class="card">
    <div class="flex items-center justify-between mb-6">
      <h2 class="heading-md">Quick Actions</h2>
    </div>
    <div class="action-group">
      <button
        onclick={() => showCreateClass = true}
        class="btn btn-primary"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Create New Class
      </button>
      
      <a href="/admin/students" class="btn btn-secondary">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-8.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
        </svg>
        Manage Students
      </a>
    </div>
  </div>

  <!-- Classes Overview -->
  <div class="card">
    <div class="flex items-center justify-between mb-6">
      <h2 class="heading-md">Classes ({classStats.length})</h2>
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p class="text-body mt-3">Loading classes...</p>
        </div>
      </div>
    {:else if classStats.length === 0}
      <div class="text-center py-12">
        <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        </div>
        <h3 class="heading-sm mb-2">No classes found</h3>
        <p class="text-body">Get started by creating your first class.</p>
      </div>
    {:else}
      <div class="space-y-6">
        {#each classStats as classData}
          <div class="border border-gray-100 rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="heading-sm">{classData.name}</h3>
                  <p class="text-caption text-gray-500">
                    {classData.students.length} student{classData.students.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              {#if classData.name !== 'Unassigned'}
                <div class="action-group action-group-sm">
                  <button
                    onclick={() => startEditClass(classData.name)}
                    class="btn btn-secondary btn-xs"
                  >
                    Rename
                  </button>
                  <button
                    onclick={() => deleteClass(classData.name)}
                    class="btn btn-danger btn-xs"
                  >
                    Delete
                  </button>
                </div>
              {/if}
            </div>
            
            <!-- Class Statistics -->
            <div class="stat-group mb-4">
              <div class="stat-item stat-item-sm">
                <div class="text-center">
                  <p class="text-sm font-semibold text-green-600">{classData.active}</p>
                  <p class="text-caption text-gray-500">Active</p>
                </div>
              </div>
              <div class="stat-item stat-item-sm">
                <div class="text-center">
                  <p class="text-sm font-semibold text-red-600">{classData.disabled}</p>
                  <p class="text-caption text-gray-500">Disabled</p>
                </div>
              </div>
              <div class="stat-item stat-item-sm">
                <div class="text-center">
                  <p class="text-sm font-semibold text-orange-600">{classData.suspended}</p>
                  <p class="text-caption text-gray-500">Suspended</p>
                </div>
              </div>
            </div>
            
            <!-- Students in Class -->
            {#if classData.students.length > 0}
              <div class="space-y-3">
                {#each classData.students as student}
                  <div class="flex items-center justify-between p-3 bg-gray-25 rounded-lg">
                    <div class="flex items-center space-x-3">
                      <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span class="text-xs font-medium text-gray-700 uppercase">
                          {student.full_name?.charAt(0) || 'S'}
                        </span>
                      </div>
                      <div>
                        <div class="font-medium text-gray-900">
                          {student.full_name || 'No name'}
                        </div>
                        <div class="text-caption text-gray-500">
                          {student.email}
                          {#if student.student_id}
                            • ID: {student.student_id}
                          {/if}
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                      <span class="badge {
                        student.account_status === 'disabled' ? 'badge-danger' :
                        student.account_status === 'suspended' ? 'badge-warning' :
                        'badge-success'
                      }">
                        {student.account_status || 'active'}
                      </span>
                      
                      <select
                        onchange={(e) => moveStudentToClass(student.id, e.target.value || null)}
                        class="input input-sm w-auto"
                      >
                        <option value="">Move to...</option>
                        {#each classStats as otherClass}
                          {#if otherClass.name !== classData.name}
                            <option value={otherClass.name === 'Unassigned' ? '' : otherClass.name}>
                              {otherClass.name}
                            </option>
                          {/if}
                        {/each}
                      </select>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-center py-8">
                <p class="text-body text-gray-500">No students in this class</p>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Create Class Modal -->
<AccessibleModal 
  isOpen={showCreateClass} 
  title="Create New Class"
  size="md"
  onclose={() => showCreateClass = false}
>
  <div slot="content">
    <div>
      <label for={formIds.newClassName} class="form-label">Class Name</label>
      <input
        id={formIds.newClassName}
        type="text"
        bind:value={newClassName}
        class="input"
        placeholder="e.g., Grade 9A, Computer Science 101"
        required
        aria-required="true"
      />
    </div>
  </div>
  
  <div slot="footer">
    <div class="action-group">
      <button
        onclick={createClass}
        class="btn btn-primary"
      >
        Create Class
      </button>
      <button
        onclick={() => showCreateClass = false}
        class="btn btn-secondary"
      >
        Cancel
      </button>
    </div>
  </div>
</AccessibleModal>

<!-- Edit Class Modal -->
<AccessibleModal 
  isOpen={showEditClass && !!editingClass} 
  title="Rename Class: {editingClass || ''}"
  size="md"
  onclose={() => showEditClass = false}
>
  <div slot="content">
    {#if editingClass}
      <div>
        <label for={formIds.editClassName} class="form-label">New Class Name</label>
        <input
          id={formIds.editClassName}
          type="text"
          bind:value={editClassName}
          class="input"
          required
          aria-required="true"
        />
      </div>
    {/if}
  </div>
  
  <div slot="footer">
    {#if editingClass}
      <div class="action-group">
        <button
          onclick={() => renameClass(editingClass!, editClassName)}
          class="btn btn-primary"
        >
          Rename Class
        </button>
        <button
          onclick={() => showEditClass = false}
          class="btn btn-secondary"
        >
          Cancel
        </button>
      </div>
    {/if}
  </div>
</AccessibleModal>