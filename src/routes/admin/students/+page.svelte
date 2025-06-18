<script lang="ts">
  import { onMount } from 'svelte'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { toastStore } from '$lib/stores/toast.svelte.js'
  import { goto } from '$app/navigation'
  import type { UserProfile, StudentEnrollment, BulkEnrollmentResult } from '$lib/types/index.js'
  
  let students = $state<UserProfile[]>([])
  let loading = $state(true)
  let enrollmentLoading = $state(false)
  let showBulkEnroll = $state(false)
  let showSingleEnroll = $state(false)
  let searchTerm = $state('')
  let classFilter = $state('')
  let statusFilter = $state('')
  
  // Single enrollment form
  let singleStudent = $state<StudentEnrollment>({
    full_name: '',
    email: '',
    class_name: '',
    student_id: ''
  })
  
  // Bulk enrollment
  let bulkText = $state('')
  let enrollmentResults = $state<BulkEnrollmentResult | null>(null)
  
  // Get unique classes
  const uniqueClasses = $derived(() => {
    const classes = students
      .map(s => s.class_name)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
    return classes.sort()
  })
  
  // Filtered students
  const filteredStudents = $derived(() => {
    return students.filter(student => {
      const matchesSearch = !searchTerm || 
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesClass = !classFilter || student.class_name === classFilter
      const matchesStatus = !statusFilter || student.account_status === statusFilter
      
      return student.role === 'student' && matchesSearch && matchesClass && matchesStatus
    })
  })
  
  // Student statistics
  const studentStats = $derived(() => {
    const allStudents = students.filter(s => s.role === 'student')
    return {
      total: allStudents.length,
      active: allStudents.filter(s => !s.account_status || s.account_status === 'active').length,
      disabled: allStudents.filter(s => s.account_status === 'disabled').length,
      suspended: allStudents.filter(s => s.account_status === 'suspended').length,
      withClass: allStudents.filter(s => s.class_name).length
    }
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
  
  async function enrollSingleStudent() {
    if (!singleStudent.full_name || !singleStudent.email) {
      toastStore.addToast('Name and email are required', 'error')
      return
    }
    
    enrollmentLoading = true
    try {
      await authStore.enrollStudent(singleStudent)
      toastStore.addToast('Student enrolled successfully!', 'success')
      singleStudent = { full_name: '', email: '', class_name: '', student_id: '' }
      showSingleEnroll = false
      await loadStudents()
    } catch (error: any) {
      toastStore.addToast(error.message || 'Failed to enroll student', 'error')
    } finally {
      enrollmentLoading = false
    }
  }
  
  async function processBulkEnrollment() {
    if (!bulkText.trim()) {
      toastStore.addToast('Please enter student data', 'error')
      return
    }
    
    enrollmentLoading = true
    try {
      const students = parseBulkText(bulkText)
      if (students.length === 0) {
        toastStore.addToast('No valid student data found', 'error')
        return
      }
      
      const results = await authStore.bulkEnrollStudents(students)
      enrollmentResults = results
      
      if (results.successful > 0) {
        toastStore.addToast(`Successfully enrolled ${results.successful} students!`, 'success')
        await loadStudents()
      }
      
      if (results.failed > 0) {
        toastStore.addToast(`${results.failed} enrollments failed. Check results below.`, 'warning')
      }
      
    } catch (error: any) {
      toastStore.addToast(error.message || 'Bulk enrollment failed', 'error')
    } finally {
      enrollmentLoading = false
    }
  }
  
  function parseBulkText(text: string): StudentEnrollment[] {
    const lines = text.trim().split('\n')
    const students: StudentEnrollment[] = []
    
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 2) {
        students.push({
          full_name: parts[0],
          email: parts[1],
          class_name: parts[2] || '',
          student_id: parts[3] || ''
        })
      }
    }
    
    return students
  }
  
  async function updateStudentStatus(studentId: string, status: 'active' | 'disabled' | 'suspended') {
    const student = students.find(s => s.id === studentId)
    const studentName = student?.full_name || 'Student'
    
    // Confirmation message based on action
    let confirmMessage = ''
    if (status === 'disabled') {
      confirmMessage = `Are you sure you want to disable ${studentName}'s account? They will not be able to log in.`
    } else if (status === 'suspended') {
      confirmMessage = `Are you sure you want to suspend ${studentName}'s account? This is a temporary restriction.`
    } else if (status === 'active') {
      confirmMessage = `Are you sure you want to reactivate ${studentName}'s account?`
    }
    
    if (!confirm(confirmMessage)) {
      return
    }
    
    try {
      await authStore.updateAccountStatus(studentId, status)
      toastStore.addToast(`${studentName}'s account is now ${status}`, 'success')
      await loadStudents()
    } catch (error: any) {
      toastStore.addToast(error.message || 'Failed to update status', 'error')
    }
  }
</script>

<div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900">Student Management</h1>
    <p class="mt-2 text-gray-600">Enroll and manage student accounts</p>
  </div>

  <!-- Action Buttons -->
  <div class="mb-6 flex flex-wrap gap-3">
    <button
      onclick={() => showSingleEnroll = true}
      class="btn btn-primary"
    >
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      Add Single Student
    </button>
    
    <button
      onclick={() => showBulkEnroll = true}
      class="btn btn-secondary"
    >
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      Bulk Enrollment
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
  </div>

  <!-- Statistics -->
  <div class="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
    <div class="bg-white rounded-lg shadow p-4">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-8.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-500">Total</p>
          <p class="text-2xl font-semibold text-gray-900">{studentStats.total}</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-4">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-500">Active</p>
          <p class="text-2xl font-semibold text-green-600">{studentStats.active}</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-4">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-500">Disabled</p>
          <p class="text-2xl font-semibold text-red-600">{studentStats.disabled}</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-4">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-500">Suspended</p>
          <p class="text-2xl font-semibold text-yellow-600">{studentStats.suspended}</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-4">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-500">With Class</p>
          <p class="text-2xl font-semibold text-purple-600">{studentStats.withClass}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Filters -->
  <div class="mb-6 bg-white rounded-lg shadow p-4">
    <h3 class="text-sm font-medium text-gray-900 mb-3">Filters</h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="Search by name, email, or student ID"
          class="input"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Class</label>
        <select bind:value={classFilter} class="input">
          <option value="">All Classes</option>
          {#each uniqueClasses as className}
            <option value={className}>{className}</option>
          {/each}
        </select>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select bind:value={statusFilter} class="input">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Students List -->
  <div class="bg-white shadow rounded-lg">
    <div class="px-6 py-4 border-b border-gray-200">
      <h2 class="text-lg font-medium text-gray-900">
        Students ({filteredStudents.length})
      </h2>
    </div>

    <div class="overflow-x-auto">
      {#if loading}
        <div class="p-6 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p class="mt-2 text-gray-600">Loading students...</p>
        </div>
      {:else if filteredStudents.length === 0}
        <div class="p-6 text-center">
          <svg class="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-8.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No students found</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by enrolling your first student.</p>
        </div>
      {:else}
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student ID
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enrolled
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each filteredStudents as student}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      {student.full_name || 'No name'}
                    </div>
                    <div class="text-sm text-gray-500">{student.email}</div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {student.class_name || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {student.student_id || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {
                    student.account_status === 'disabled' ? 'bg-red-100 text-red-800' :
                    student.account_status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }">
                    {student.account_status || 'active'}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(student.created_at).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex space-x-2">
                    {#if student.account_status === 'active'}
                      <button
                        onclick={() => updateStudentStatus(student.id, 'disabled')}
                        class="text-red-600 hover:text-red-900 text-xs"
                        title="Disable account"
                      >
                        Disable
                      </button>
                      <button
                        onclick={() => updateStudentStatus(student.id, 'suspended')}
                        class="text-yellow-600 hover:text-yellow-900 text-xs"
                        title="Suspend account temporarily"
                      >
                        Suspend
                      </button>
                    {:else if student.account_status === 'disabled'}
                      <button
                        onclick={() => updateStudentStatus(student.id, 'active')}
                        class="text-green-600 hover:text-green-900 text-xs"
                        title="Reactivate account"
                      >
                        Enable
                      </button>
                    {:else if student.account_status === 'suspended'}
                      <button
                        onclick={() => updateStudentStatus(student.id, 'active')}
                        class="text-green-600 hover:text-green-900 text-xs"
                        title="Reactivate account"
                      >
                        Reactivate
                      </button>
                      <button
                        onclick={() => updateStudentStatus(student.id, 'disabled')}
                        class="text-red-600 hover:text-red-900 text-xs"
                        title="Disable account permanently"
                      >
                        Disable
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
</div>

<!-- Single Student Enrollment Modal -->
{#if showSingleEnroll}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity" onclick={() => showSingleEnroll = false}>
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
            Enroll Single Student
          </h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                bind:value={singleStudent.full_name}
                class="input"
                placeholder="Enter student's full name"
                required
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                bind:value={singleStudent.email}
                class="input"
                placeholder="Enter student's email"
                required
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <input
                type="text"
                bind:value={singleStudent.class_name}
                class="input"
                placeholder="e.g., Grade 9A, Computer Science 101"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
              <input
                type="text"
                bind:value={singleStudent.student_id}
                class="input"
                placeholder="Optional student ID number"
              />
            </div>
          </div>
        </div>
        
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            onclick={enrollSingleStudent}
            disabled={enrollmentLoading}
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
          >
            {enrollmentLoading ? 'Enrolling...' : 'Enroll Student'}
          </button>
          <button
            onclick={() => showSingleEnroll = false}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Bulk Enrollment Modal -->
{#if showBulkEnroll}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity" onclick={() => showBulkEnroll = false}>
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
            Bulk Student Enrollment
          </h3>
          
          <div class="mb-4">
            <p class="text-sm text-gray-600 mb-2">
              Enter student data, one per line in CSV format:
            </p>
            <p class="text-sm text-gray-500 mb-3">
              Format: <code>Full Name, Email, Class (optional), Student ID (optional)</code>
            </p>
            
            <textarea
              bind:value={bulkText}
              rows="8"
              class="input"
              placeholder="John Doe, john@example.com, Grade 9A, 12345&#10;Jane Smith, jane@example.com, Grade 9B&#10;..."
            ></textarea>
          </div>
          
          {#if enrollmentResults}
            <div class="mb-4 p-4 bg-gray-50 rounded-md">
              <h4 class="text-sm font-medium text-gray-900 mb-2">Enrollment Results</h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="text-green-600">
                  ✓ Successful: {enrollmentResults.successful}
                </div>
                <div class="text-red-600">
                  ✗ Failed: {enrollmentResults.failed}
                </div>
              </div>
              
              {#if enrollmentResults.errors.length > 0}
                <div class="mt-3">
                  <h5 class="text-xs font-medium text-red-900 mb-1">Errors:</h5>
                  <div class="text-xs text-red-700 max-h-32 overflow-y-auto">
                    {#each enrollmentResults.errors as error}
                      <div>{error}</div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
        
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            onclick={processBulkEnrollment}
            disabled={enrollmentLoading}
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
          >
            {enrollmentLoading ? 'Processing...' : 'Enroll Students'}
          </button>
          <button
            onclick={() => showBulkEnroll = false}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}