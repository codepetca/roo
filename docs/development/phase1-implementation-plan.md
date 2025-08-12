# 🚀 Phase 1 Technical Implementation Plan

**Goal**: Complete Student Access System (4-6 weeks)  
**Status**: Ready to Begin Implementation  
**Last Updated**: January 2025

This document provides detailed technical specifications for implementing the complete student access system, building on the existing 75% complete infrastructure.

## 📋 **Technical Architecture Overview**

### **Current State (Existing)**
```
✅ Teacher OAuth & Onboarding
✅ AppScript Data Collection  
✅ Firebase Functions & API
✅ AI Grading (Gemini 1.5 Flash)
✅ Student Passcode Auth System
✅ Basic Student Dashboard
✅ Type Safety & Testing (90+ tests)
```

### **Missing Components (Phase 1)**
```
❌ Email Service Integration
❌ Student Invitation System
❌ Roster Management Interface
❌ Enhanced Student Portal  
❌ Teacher Student Management
❌ Mobile-Optimized Design
```

---

## 🏗️ **Implementation Breakdown**

### **1. Email Service Integration** (Week 1)

#### **1.1 Email Service Setup**
**New File**: `functions/src/services/email-service.ts`

```typescript
// Email service with SendGrid integration
export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
  personalizations: Record<string, string>;
}

export interface EmailService {
  sendPasscode(email: string, passcode: string, teacherName: string): Promise<void>;
  sendInvitation(email: string, inviteToken: string, classroomName: string): Promise<void>;
  sendBulkInvitations(invitations: StudentInvitation[]): Promise<EmailDeliveryReport>;
  trackDelivery(messageId: string): Promise<EmailStatus>;
}

// Implementation with SendGrid
export class SendGridEmailService implements EmailService {
  private sg: SendGridAPI;
  private templates: Map<EmailType, EmailTemplate>;
  
  constructor(apiKey: string) {
    this.sg = require('@sendgrid/mail');
    this.sg.setApiKey(apiKey);
    this.loadEmailTemplates();
  }
  
  // Detailed implementation methods...
}
```

#### **1.2 Email Templates**
**New Directory**: `functions/src/templates/email/`

```html
<!-- student-passcode.html -->
<div class="email-container">
  <h2>Your Roo Login Code</h2>
  <p>Hi {{studentName}},</p>
  <p>{{teacherName}} has invited you to view your grades on Roo.</p>
  <div class="passcode-box">{{passcode}}</div>
  <p>This code expires in 10 minutes.</p>
  <a href="{{loginUrl}}" class="button">Access Your Grades</a>
</div>

<!-- student-invitation.html -->
<div class="email-container">
  <h2>You're Invited to Roo!</h2>
  <p>Hi {{studentName}},</p>
  <p>{{teacherName}} has invited you to join {{classroomName}} on Roo to view your assignments and grades.</p>
  <a href="{{registrationUrl}}" class="button">Join Classroom</a>
  <p>This invitation expires in 7 days.</p>
</div>
```

#### **1.3 Environment Configuration**
**Update**: `functions/.env` and Firebase Functions config

```bash
# Email service configuration
SENDGRID_API_KEY=SG.xxxxx
EMAIL_FROM_ADDRESS=noreply@roo-app.com  
EMAIL_FROM_NAME=Roo Grading System
EMAIL_TEMPLATES_PATH=./templates/email/

# Production vs Development
NODE_ENV=development
FRONTEND_BASE_URL=https://roo-app.web.app
```

---

### **2. Student Invitation System** (Week 1-2)

#### **2.1 Invitation Token System**
**New File**: `functions/src/services/invitation-service.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import { SignJWT, jwtVerify } from 'jose';

export interface StudentInvitation {
  id: string;
  classroomId: string;
  teacherId: string;
  studentEmail: string;
  studentName?: string;
  token: string;
  status: 'pending' | 'sent' | 'registered' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  registeredAt?: Date;
}

export class InvitationService {
  private static readonly JWT_SECRET = process.env.INVITATION_JWT_SECRET!;
  private static readonly EXPIRY_DAYS = 7;
  
  async createInvitation(classroomId: string, teacherId: string, studentEmail: string): Promise<StudentInvitation> {
    const invitationId = uuidv4();
    const expiresAt = new Date(Date.now() + (InvitationService.EXPIRY_DAYS * 24 * 60 * 60 * 1000));
    
    // Create JWT token with claims
    const token = await new SignJWT({
      invitationId,
      classroomId,
      teacherId,
      studentEmail,
      exp: Math.floor(expiresAt.getTime() / 1000)
    })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(new TextEncoder().encode(InvitationService.JWT_SECRET));
    
    const invitation: StudentInvitation = {
      id: invitationId,
      classroomId,
      teacherId,
      studentEmail,
      token,
      status: 'pending',
      createdAt: new Date(),
      expiresAt
    };
    
    // Store in Firestore
    await getFirestore()
      .collection('studentInvitations')
      .doc(invitationId)
      .set(invitation);
    
    return invitation;
  }
  
  async validateToken(token: string): Promise<StudentInvitation | null> {
    try {
      const { payload } = await jwtVerify(
        token, 
        new TextEncoder().encode(InvitationService.JWT_SECRET)
      );
      
      const invitationDoc = await getFirestore()
        .collection('studentInvitations')
        .doc(payload.invitationId as string)
        .get();
      
      if (!invitationDoc.exists || invitationDoc.data()?.status !== 'sent') {
        return null;
      }
      
      return invitationDoc.data() as StudentInvitation;
    } catch (error) {
      return null;
    }
  }
}
```

#### **2.2 Bulk Invitation API**
**New File**: `functions/src/routes/student-invitations.ts`

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { InvitationService } from '../services/invitation-service';
import { EmailService } from '../services/email-service';

const router = Router();

// POST /api/student-invitations/bulk
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const { classroomId, students } = req.body;
    const teacherId = req.user.uid;
    
    // Validate teacher has permission for classroom
    await validateTeacherClassroomAccess(teacherId, classroomId);
    
    const invitationService = new InvitationService();
    const emailService = new EmailService();
    
    const invitations: StudentInvitation[] = [];
    
    // Create invitations for all students
    for (const student of students) {
      const invitation = await invitationService.createInvitation(
        classroomId, 
        teacherId, 
        student.email
      );
      invitations.push(invitation);
    }
    
    // Send bulk emails
    const deliveryReport = await emailService.sendBulkInvitations(invitations);
    
    res.json({
      success: true,
      invitations: invitations.length,
      deliveryReport
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

### **3. Student Registration Landing Page** (Week 2)

#### **3.1 Registration Page**
**New File**: `frontend/src/routes/students/join/[token]/+page.svelte`

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { api } from '$lib/api';
  import { goto } from '$app/navigation';
  
  // Svelte 5 runes
  let loading = $state(true);
  let invitation = $state(null);
  let error = $state(null);
  let email = $state('');
  let passcodeRequested = $state(false);
  let passcode = $state('');
  
  const token = $page.params.token;
  
  async function validateInvitation() {
    try {
      const response = await api.validateInvitation(token);
      if (response.valid) {
        invitation = response.invitation;
        email = response.invitation.studentEmail;
      } else {
        error = 'Invalid or expired invitation';
      }
    } catch (err) {
      error = 'Failed to validate invitation';
    } finally {
      loading = false;
    }
  }
  
  async function requestPasscode() {
    try {
      await api.sendPasscode(email);
      passcodeRequested = true;
    } catch (err) {
      error = 'Failed to send passcode';
    }
  }
  
  async function completeRegistration() {
    try {
      const response = await api.verifyPasscode(email, passcode);
      if (response.success) {
        // Complete invitation and redirect to dashboard
        await api.completeInvitation(token);
        goto('/dashboard/student');
      }
    } catch (err) {
      error = 'Registration failed';
    }
  }
  
  // Load invitation on mount
  $effect(() => {
    validateInvitation();
  });
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  {#if loading}
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Validating invitation...</p>
    </div>
  {:else if error}
    <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
      <div class="text-center">
        <div class="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Invitation Error</h2>
        <p class="text-gray-600 mb-6">{error}</p>
        <a href="/" class="btn-primary">Back to Home</a>
      </div>
    </div>
  {:else if invitation}
    <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
      <div class="text-center mb-6">
        <div class="text-blue-500 text-6xl mb-4">📚</div>
        <h2 class="text-2xl font-bold text-gray-900">Join {invitation.classroomName}</h2>
        <p class="text-gray-600">You've been invited by {invitation.teacherName}</p>
      </div>
      
      {#if !passcodeRequested}
        <!-- Step 1: Email Confirmation -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input 
              bind:value={email} 
              type="email" 
              class="input-field" 
              readonly
            />
          </div>
          <button 
            onclick={requestPasscode}
            class="btn-primary w-full"
          >
            Send Login Code
          </button>
        </div>
      {:else}
        <!-- Step 2: Passcode Entry -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Enter 6-Digit Code</label>
            <input 
              bind:value={passcode} 
              type="text" 
              maxlength="6"
              class="input-field text-center text-2xl tracking-widest"
              placeholder="000000"
            />
            <p class="text-sm text-gray-500 mt-2">Check your email for the login code</p>
          </div>
          <button 
            onclick={completeRegistration}
            class="btn-primary w-full"
            disabled={passcode.length !== 6}
          >
            Complete Registration
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .btn-primary {
    @apply bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .input-field {
    @apply w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  }
</style>
```

#### **3.2 Registration API Endpoints**
**Update**: `functions/src/routes/auth/passcode.ts`

```typescript
// Add classroom association to existing passcode verification
export async function verifyPasscodeWithInvitation(req: Request, res: Response): Promise<void> {
  try {
    const { email, passcode, invitationToken } = req.body;
    
    // Existing passcode verification logic...
    const isValidPasscode = await verifyPasscodeLogic(email, passcode);
    
    if (isValidPasscode && invitationToken) {
      // Validate and complete invitation
      const invitationService = new InvitationService();
      const invitation = await invitationService.validateToken(invitationToken);
      
      if (invitation) {
        // Associate student with classroom
        await enrollStudentInClassroom(userRecord.uid, invitation.classroomId);
        
        // Mark invitation as completed
        await invitationService.completeInvitation(invitation.id);
      }
    }
    
    // Return authentication response...
  } catch (error) {
    // Error handling...
  }
}
```

---

### **4. Enhanced Student Portal** (Week 3-4)

#### **4.1 Grade History Enhancement**
**Update**: `frontend/src/routes/dashboard/student/grades/+page.svelte`

```svelte
<script lang="ts">
  import { api } from '$lib/api';
  import GradeCard from '$lib/components/student/GradeCard.svelte';
  import FeedbackModal from '$lib/components/student/FeedbackModal.svelte';
  
  let grades = $state([]);
  let selectedGrade = $state(null);
  let showFeedbackModal = $state(false);
  let filterBy = $state('all'); // 'all', 'quiz', 'assignment'
  let sortBy = $state('date'); // 'date', 'score', 'assignment'
  
  // Derived computations with Svelte 5
  let filteredGrades = $derived(() => {
    let filtered = grades;
    if (filterBy !== 'all') {
      filtered = filtered.filter(g => 
        filterBy === 'quiz' ? g.assignment.isQuiz : !g.assignment.isQuiz
      );
    }
    
    return filtered.sort((a, b) => {
      if (sortBy === 'date') return new Date(b.gradedAt) - new Date(a.gradedAt);
      if (sortBy === 'score') return b.percentage - a.percentage;
      return a.assignment.title.localeCompare(b.assignment.title);
    });
  });
  
  let gradeStats = $derived(() => {
    if (grades.length === 0) return null;
    
    const scores = grades.map(g => g.percentage);
    return {
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      trend: calculateTrend(grades)
    };
  });
  
  function showFeedback(grade) {
    selectedGrade = grade;
    showFeedbackModal = true;
  }
  
  async function loadGrades() {
    try {
      grades = await api.getStudentGrades();
    } catch (error) {
      console.error('Failed to load grades:', error);
    }
  }
  
  $effect(() => {
    loadGrades();
  });
</script>

<!-- Enhanced grade display with filtering, sorting, and detailed feedback -->
<div class="space-y-6">
  <!-- Grade Statistics Summary -->
  {#if gradeStats}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-2xl font-bold text-blue-600">{gradeStats.average}%</div>
        <div class="text-sm text-gray-600">Average</div>
      </div>
      <!-- More stat cards... -->
    </div>
  {/if}
  
  <!-- Filtering and Sorting Controls -->
  <div class="bg-white p-4 rounded-lg shadow">
    <div class="flex space-x-4">
      <select bind:value={filterBy} class="select-field">
        <option value="all">All Assignments</option>
        <option value="quiz">Quizzes Only</option>
        <option value="assignment">Assignments Only</option>
      </select>
      
      <select bind:value={sortBy} class="select-field">
        <option value="date">Sort by Date</option>
        <option value="score">Sort by Score</option>
        <option value="assignment">Sort by Assignment</option>
      </select>
    </div>
  </div>
  
  <!-- Grade List -->
  <div class="space-y-4">
    {#each filteredGrades as grade (grade.id)}
      <GradeCard 
        {grade} 
        onclick={() => showFeedback(grade)}
      />
    {/each}
  </div>
</div>

<!-- Feedback Modal -->
{#if showFeedbackModal && selectedGrade}
  <FeedbackModal 
    grade={selectedGrade}
    onClose={() => showFeedbackModal = false}
  />
{/if}
```

#### **4.2 Detailed Feedback Component**
**New File**: `frontend/src/lib/components/student/FeedbackModal.svelte`

```svelte
<script lang="ts">
  import type { Grade } from '@shared/types';
  
  interface Props {
    grade: Grade;
    onClose: () => void;
  }
  
  let { grade, onClose }: Props = $props();
  
  let showFullFeedback = $state(false);
  let activeTab = $state('feedback'); // 'feedback', 'rubric', 'history'
  
  function getScoreColor(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  }
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
  <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
    <!-- Modal Header -->
    <div class="bg-gray-50 px-6 py-4 border-b">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">{grade.assignment.title}</h3>
          <p class="text-sm text-gray-600">Submitted: {new Date(grade.submittedAt).toLocaleDateString()}</p>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold {getScoreColor(grade.score, grade.maxScore)}">
            {grade.score}/{grade.maxScore}
          </div>
          <div class="text-sm text-gray-600">{Math.round((grade.score/grade.maxScore)*100)}%</div>
        </div>
      </div>
    </div>
    
    <!-- Tab Navigation -->
    <div class="border-b">
      <nav class="flex">
        <button 
          class="tab-button {activeTab === 'feedback' ? 'tab-active' : ''}"
          onclick={() => activeTab = 'feedback'}
        >
          AI Feedback
        </button>
        <button 
          class="tab-button {activeTab === 'rubric' ? 'tab-active' : ''}"
          onclick={() => activeTab = 'rubric'}
        >
          Rubric
        </button>
        <button 
          class="tab-button {activeTab === 'history' ? 'tab-active' : ''}"
          onclick={() => activeTab = 'history'}
        >
          History
        </button>
      </nav>
    </div>
    
    <!-- Tab Content -->
    <div class="p-6 overflow-y-auto max-h-96">
      {#if activeTab === 'feedback'}
        <!-- AI Feedback Content -->
        <div class="space-y-4">
          <div>
            <h4 class="font-semibold text-gray-900 mb-2">Overall Feedback</h4>
            <div class="bg-blue-50 p-4 rounded-lg">
              <p class="text-gray-700">{grade.feedback}</p>
            </div>
          </div>
          
          {#if grade.gradingDetails?.criteria}
            <div>
              <h4 class="font-semibold text-gray-900 mb-2">Detailed Breakdown</h4>
              <div class="space-y-3">
                {#each grade.gradingDetails.criteria as criterion}
                  <div class="border rounded-lg p-3">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-medium">{criterion.name}</span>
                      <span class="text-sm text-gray-600">
                        {criterion.score}/{criterion.maxScore}
                      </span>
                    </div>
                    <p class="text-sm text-gray-700">{criterion.feedback}</p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {:else if activeTab === 'rubric'}
        <!-- Rubric Content -->
        <div class="space-y-4">
          <h4 class="font-semibold text-gray-900">Assignment Rubric</h4>
          {#if grade.assignment.gradingRubric}
            <div class="space-y-2">
              {#each grade.assignment.gradingRubric.criteria as criterion}
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span>{criterion}</span>
                  <span class="text-sm text-gray-600">Evaluated ✓</span>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-600">No specific rubric provided for this assignment.</p>
          {/if}
        </div>
      {:else if activeTab === 'history'}
        <!-- Grade History -->
        <div class="space-y-4">
          <h4 class="font-semibold text-gray-900">Grade History</h4>
          <div class="space-y-2">
            <div class="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
              <div>
                <span class="font-medium">Current Grade</span>
                <div class="text-sm text-gray-600">
                  Graded on {new Date(grade.gradedAt).toLocaleDateString()}
                </div>
              </div>
              <span class="text-green-600 font-semibold">{grade.score}/{grade.maxScore}</span>
            </div>
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Modal Footer -->
    <div class="bg-gray-50 px-6 py-4 border-t">
      <div class="flex items-center justify-between">
        <button 
          class="text-blue-600 hover:text-blue-700 font-medium"
          onclick={() => {/* Open grade inquiry */}}
        >
          Ask a Question
        </button>
        <button 
          onclick={onClose}
          class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .tab-button {
    @apply px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent;
  }
  
  .tab-active {
    @apply text-blue-600 border-blue-600;
  }
</style>
```

---

### **5. Teacher Student Management** (Week 4-5)

#### **5.1 Student Management Dashboard**
**New File**: `frontend/src/routes/dashboard/teacher/students/+page.svelte`

```svelte
<script lang="ts">
  import { api } from '$lib/api';
  import StudentRosterUpload from '$lib/components/teacher/StudentRosterUpload.svelte';
  import StudentAccessControls from '$lib/components/teacher/StudentAccessControls.svelte';
  
  let students = $state([]);
  let invitations = $state([]);
  let selectedClassroom = $state(null);
  let showRosterUpload = $state(false);
  let bulkActionMode = $state(false);
  let selectedStudents = $state(new Set());
  
  // Student statistics
  let studentStats = $derived(() => {
    const total = students.length;
    const active = students.filter(s => s.status === 'active').length;
    const pending = invitations.filter(i => i.status === 'sent').length;
    const registered = students.filter(s => s.lastLoginAt).length;
    
    return { total, active, pending, registered };
  });
  
  async function loadStudents() {
    try {
      if (selectedClassroom) {
        students = await api.getClassroomStudents(selectedClassroom.id);
        invitations = await api.getClassroomInvitations(selectedClassroom.id);
      }
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  }
  
  async function inviteStudents(studentList) {
    try {
      const result = await api.sendBulkInvitations({
        classroomId: selectedClassroom.id,
        students: studentList
      });
      
      // Refresh data
      await loadStudents();
      
      // Show success message
      console.log(`Invited ${result.invitations} students`);
    } catch (error) {
      console.error('Failed to invite students:', error);
    }
  }
  
  function toggleStudentSelection(studentId) {
    if (selectedStudents.has(studentId)) {
      selectedStudents.delete(studentId);
    } else {
      selectedStudents.add(studentId);
    }
    selectedStudents = new Set(selectedStudents); // Trigger reactivity
  }
  
  async function performBulkAction(action) {
    const studentIds = Array.from(selectedStudents);
    
    try {
      switch (action) {
        case 'reset-passcode':
          await api.bulkResetPasscodes(studentIds);
          break;
        case 'disable-access':
          await api.bulkDisableStudents(studentIds);
          break;
        case 'enable-access':
          await api.bulkEnableStudents(studentIds);
          break;
      }
      
      await loadStudents();
      selectedStudents.clear();
      bulkActionMode = false;
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  }
  
  $effect(() => {
    if (selectedClassroom) {
      loadStudents();
    }
  });
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Student Management</h1>
      <p class="text-gray-600">Manage student access and monitor engagement</p>
    </div>
    <div class="flex space-x-3">
      <button 
        onclick={() => showRosterUpload = true}
        class="btn-primary"
      >
        + Invite Students
      </button>
      <button 
        onclick={() => bulkActionMode = !bulkActionMode}
        class="btn-secondary"
        disabled={students.length === 0}
      >
        Bulk Actions
      </button>
    </div>
  </div>
  
  <!-- Student Statistics -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="bg-white p-4 rounded-lg shadow">
      <div class="text-2xl font-bold text-blue-600">{studentStats.total}</div>
      <div class="text-sm text-gray-600">Total Students</div>
    </div>
    <div class="bg-white p-4 rounded-lg shadow">
      <div class="text-2xl font-bold text-green-600">{studentStats.active}</div>
      <div class="text-sm text-gray-600">Active</div>
    </div>
    <div class="bg-white p-4 rounded-lg shadow">
      <div class="text-2xl font-bold text-yellow-600">{studentStats.pending}</div>
      <div class="text-sm text-gray-600">Pending Invites</div>
    </div>
    <div class="bg-white p-4 rounded-lg shadow">
      <div class="text-2xl font-bold text-purple-600">{studentStats.registered}</div>
      <div class="text-sm text-gray-600">Registered</div>
    </div>
  </div>
  
  <!-- Bulk Actions Bar -->
  {#if bulkActionMode}
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <span class="text-blue-800 font-medium">
          {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
        </span>
        <div class="space-x-2">
          <button 
            onclick={() => performBulkAction('reset-passcode')}
            class="btn-sm btn-secondary"
            disabled={selectedStudents.size === 0}
          >
            Reset Passcodes
          </button>
          <button 
            onclick={() => performBulkAction('disable-access')}
            class="btn-sm btn-danger"
            disabled={selectedStudents.size === 0}
          >
            Disable Access
          </button>
          <button 
            onclick={() => bulkActionMode = false}
            class="btn-sm btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Student List -->
  <div class="bg-white shadow rounded-lg">
    <div class="px-6 py-4 border-b border-gray-200">
      <h3 class="text-lg font-semibold text-gray-900">Student Roster</h3>
    </div>
    
    {#if students.length === 0 && invitations.length === 0}
      <div class="p-8 text-center">
        <div class="text-gray-400 text-6xl mb-4">👥</div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">No Students Yet</h3>
        <p class="text-gray-600 mb-4">Get started by inviting students to your classroom</p>
        <button 
          onclick={() => showRosterUpload = true}
          class="btn-primary"
        >
          Invite Students
        </button>
      </div>
    {:else}
      <div class="divide-y divide-gray-200">
        {#each students as student (student.id)}
          <div class="px-6 py-4 flex items-center justify-between">
            <div class="flex items-center space-x-4">
              {#if bulkActionMode}
                <input 
                  type="checkbox" 
                  checked={selectedStudents.has(student.id)}
                  onchange={() => toggleStudentSelection(student.id)}
                  class="checkbox"
                />
              {/if}
              
              <div class="flex-shrink-0">
                <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span class="text-blue-600 font-medium">
                    {student.name?.charAt(0) || student.email.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div>
                <div class="font-medium text-gray-900">{student.name || 'No name'}</div>
                <div class="text-sm text-gray-600">{student.email}</div>
                {#if student.lastLoginAt}
                  <div class="text-xs text-gray-500">
                    Last login: {new Date(student.lastLoginAt).toLocaleDateString()}
                  </div>
                {/if}
              </div>
            </div>
            
            <div class="flex items-center space-x-3">
              <!-- Status Badge -->
              <span class="status-badge status-{student.status}">
                {student.status === 'active' ? 'Active' : 
                 student.status === 'disabled' ? 'Disabled' : 'Inactive'}
              </span>
              
              <!-- Actions Dropdown -->
              <div class="relative">
                <button class="btn-sm btn-secondary">
                  Actions ▾
                </button>
                <!-- Dropdown menu would go here -->
              </div>
            </div>
          </div>
        {/each}
        
        <!-- Pending Invitations -->
        {#each invitations.filter(i => i.status === 'sent') as invitation (invitation.id)}
          <div class="px-6 py-4 flex items-center justify-between bg-gray-50">
            <div class="flex items-center space-x-4">
              <div class="flex-shrink-0">
                <div class="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span class="text-yellow-600 font-medium">⏳</span>
                </div>
              </div>
              
              <div>
                <div class="font-medium text-gray-900">{invitation.studentEmail}</div>
                <div class="text-sm text-gray-600">
                  Invited {new Date(invitation.createdAt).toLocaleDateString()}
                </div>
                <div class="text-xs text-gray-500">
                  Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <span class="status-badge status-pending">Pending</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Student Roster Upload Modal -->
{#if showRosterUpload}
  <StudentRosterUpload 
    classroom={selectedClassroom}
    onComplete={inviteStudents}
    onClose={() => showRosterUpload = false}
  />
{/if}

<style>
  .btn-primary {
    @apply bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors;
  }
  
  .btn-secondary {
    @apply bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors;
  }
  
  .btn-danger {
    @apply bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors;
  }
  
  .btn-sm {
    @apply px-3 py-1 text-sm;
  }
  
  .status-badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }
  
  .status-active {
    @apply bg-green-100 text-green-800;
  }
  
  .status-disabled {
    @apply bg-red-100 text-red-800;
  }
  
  .status-pending {
    @apply bg-yellow-100 text-yellow-800;
  }
  
  .checkbox {
    @apply h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500;
  }
</style>
```

---

## 📱 **Mobile Optimization** (Week 5-6)

### **Mobile-First Design Principles**
- **Progressive Web App**: Service worker for offline grade viewing
- **Touch-Friendly Interface**: Large buttons and touch targets
- **Responsive Grid**: Mobile-first responsive design patterns
- **Performance**: Lazy loading and optimized images

### **PWA Configuration**
**New File**: `frontend/static/manifest.json`

```json
{
  "name": "Roo Grade Viewer",
  "short_name": "Roo",
  "description": "View your assignments and grades",
  "start_url": "/dashboard/student",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png", 
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## ✅ **Testing Strategy** 

### **Unit Tests** (Throughout Implementation)
- Email service integration tests
- Invitation token validation tests  
- Student registration flow tests
- API endpoint tests with authentication

### **Integration Tests** (Week 5-6)
- End-to-end student onboarding flow
- Teacher bulk invitation workflow
- Email delivery and tracking
- Mobile responsive design tests

### **Production Validation** (Week 6)
- Pilot teacher testing with real classrooms
- Student feedback collection and iteration
- Performance testing with 100+ concurrent students
- Email deliverability testing across providers

---

## 🎯 **Success Metrics**

### **Technical Metrics**
- [ ] Email delivery rate > 95%
- [ ] Student registration completion > 80%
- [ ] Mobile page load time < 3 seconds
- [ ] System handles 100+ students per teacher
- [ ] Zero data breaches or unauthorized access

### **User Experience Metrics**  
- [ ] Teachers can invite entire roster in < 5 minutes
- [ ] Students complete registration in < 3 minutes
- [ ] Student engagement with grade portal > 70%
- [ ] Teacher satisfaction with student management tools > 8/10

---

**This implementation plan provides the technical foundation to complete the student access system and achieve the project goal of enabling secure, scalable student access to AI-graded assignments.**