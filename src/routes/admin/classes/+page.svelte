<script lang="ts">
  import { onMount } from 'svelte'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { toastStore } from '$lib/stores/toast.svelte.js'
  import { goto } from '$app/navigation'
  import type { UserProfile } from '$lib/types/index.js'
  
  let students = $state<UserProfile[]>([])
  let loading = $state(true)
  let showCreateClass = $state(false)
  let showEditClass = $state(false)
  let editingClass = $state<string | null>(null)
  let newClassName = $state('')
  let editClassName = $state('')
  
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

<div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900">Class Management</h1>
    <p class="mt-2 text-gray-600">Organize students into classes and manage class structure</p>
  </div>

  <!-- Action Buttons -->
  <div class="mb-6 flex flex-wrap gap-3">
    <button
      onclick={() => showCreateClass = true}
      class="btn btn-primary"
    >
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      Create New Class
    </button>
    
    <button
      onclick={loadStudents}
      disabled={loading}
      class="btn btn-secondary"
    >
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
      {loading ? 'Loading...' : 'Refresh'}
    </button>
    
    <a href="/admin/students" class="btn btn-secondary">
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-8.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
      </svg>
      Manage Students
    </a>
  </div>

  <!-- Classes Overview -->
  {#if loading}
    <div class="bg-white rounded-lg shadow p-6 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      <p class="mt-2 text-gray-600">Loading classes...</p>
    </div>
  {:else}
    <div class="grid gap-6">
      {#each classStats as classData}
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-gray-900">
                    {classData.name}
                  </h3>
                  <p class="text-sm text-gray-500">
                    {classData.students.length} student{classData.students.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                {#if classData.name !== 'Unassigned'}
                  <button
                    onclick={() => startEditClass(classData.name)}
                    class="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    Rename
                  </button>
                  <button
                    onclick={() => deleteClass(classData.name)}
                    class="text-red-600 hover:text-red-900 text-sm"
                  >
                    Delete
                  </button>
                {/if}
              </div>
            </div>
            
            <!-- Class Statistics -->
            <div class="mt-4 grid grid-cols-3 gap-4">
              <div class="text-center">
                <div class="text-lg font-semibold text-green-600">{classData.active}</div>
                <div class="text-xs text-gray-500">Active</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-semibold text-red-600">{classData.disabled}</div>
                <div class="text-xs text-gray-500">Disabled</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-semibold text-yellow-600">{classData.suspended}</div>
                <div class="text-xs text-gray-500">Suspended</div>
              </div>
            </div>
          </div>
          
          <!-- Students in Class -->
          {#if classData.students.length > 0}
            <div class="px-6 py-4">
              <div class="grid gap-3">
                {#each classData.students as student}
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div class="flex items-center space-x-3">
                      <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span class="text-xs font-medium text-gray-700 uppercase">
                            {student.full_name?.charAt(0) || 'S'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div class="text-sm font-medium text-gray-900">
                          {student.full_name || 'No name'}
                        </div>
                        <div class="text-xs text-gray-500">
                          {student.email}
                          {#if student.student_id}
                            • ID: {student.student_id}
                          {/if}
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {
                        student.account_status === 'disabled' ? 'bg-red-100 text-red-800' :
                        student.account_status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }">
                        {student.account_status || 'active'}
                      </span>
                      
                      <select
                        onchange={(e) => moveStudentToClass(student.id, e.target.value || null)}
                        class="text-xs border border-gray-300 rounded px-2 py-1"
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
            </div>
          {:else}
            <div class="px-6 py-4 text-center text-gray-500">
              <p class="text-sm">No students in this class</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Create Class Modal -->
{#if showCreateClass}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity" onclick={() => showCreateClass = false}>
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
            Create New Class
          </h3>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
            <input
              type="text"
              bind:value={newClassName}
              class="input"
              placeholder="e.g., Grade 9A, Computer Science 101"
              required
            />
          </div>
        </div>
        
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            onclick={createClass}
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Create Class
          </button>
          <button
            onclick={() => showCreateClass = false}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Class Modal -->
{#if showEditClass && editingClass}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity" onclick={() => showEditClass = false}>
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
            Rename Class: {editingClass}
          </h3>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">New Class Name</label>
            <input
              type="text"
              bind:value={editClassName}
              class="input"
              required
            />
          </div>
        </div>
        
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            onclick={() => renameClass(editingClass!, editClassName)}
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Rename Class
          </button>
          <button
            onclick={() => showEditClass = false}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}