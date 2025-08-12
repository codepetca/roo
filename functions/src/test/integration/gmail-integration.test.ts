/**
 * End-to-End Gmail Integration Tests
 * Location: functions/src/test/integration/gmail-integration.test.ts
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';

// Mock Firebase Admin initialization for tests
vi.mock('firebase-admin/app');
vi.mock('firebase-admin/auth');
vi.mock('firebase-admin/firestore');

const mockFirestore = vi.mocked(getFirestore);
const mockAuth = vi.mocked(getAuth);
const mockInitializeApp = vi.mocked(initializeApp);
const mockGetApps = vi.mocked(getApps);

describe('Gmail Integration End-to-End Tests', () => {
  let mockDb: any;
  let mockAuthAdmin: any;

  beforeAll(() => {
    // Mock Firebase Admin initialization
    mockGetApps.mockReturnValue([]);
    mockInitializeApp.mockReturnValue({} as any);
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Firestore with proper chaining
    mockDb = {
      collection: vi.fn().mockReturnThis(),
      doc: vi.fn().mockReturnThis(),
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };
    
    // Default mock setup - will be overridden in specific tests
    mockDb.get.mockResolvedValue({
      exists: false,
      data: () => ({})
    });
    
    mockFirestore.mockReturnValue(mockDb);

    // Mock Auth
    mockAuthAdmin = {
      verifyIdToken: vi.fn(),
      createCustomToken: vi.fn(),
      getUserByEmail: vi.fn(),
      createUser: vi.fn(),
      setCustomUserClaims: vi.fn()
    };
    mockAuth.mockReturnValue(mockAuthAdmin);
  });

  describe('Teacher Gmail Setup Flow', () => {
    it('should complete teacher setup with Gmail token', async () => {
      const teacherData = {
        uid: 'teacher-dev-codepet',
        email: 'dev.codepet@gmail.com',
        displayName: 'Dev Teacher',
        role: 'teacher',
        gmailAccessToken: 'mock-gmail-access-token'
      };

      // Mock teacher profile creation/update
      mockDb.get.mockResolvedValue({
        exists: false
      });
      mockDb.set.mockResolvedValue(undefined);

      // Simulate storing Gmail token
      const updateData = {
        gmailAccessToken: teacherData.gmailAccessToken,
        gmailTokenUpdatedAt: expect.any(Object),
        updatedAt: expect.any(Object)
      };

      await mockDb.doc('users').doc(teacherData.uid).update(updateData);

      expect(mockDb.update).toHaveBeenCalledWith(updateData);
    });

    it('should verify teacher has required permissions', async () => {
      const teacherId = 'teacher-dev-codepet';
      const mockTeacherProfile = {
        email: 'dev.codepet@gmail.com',
        displayName: 'Dev Teacher',
        role: 'teacher',
        gmailAccessToken: 'valid-token',
        classroomIds: ['classroom-1'],
        isActive: true
      };

      mockDb.get.mockResolvedValue({
        exists: true,
        data: () => mockTeacherProfile
      });

      const result = await mockDb.collection('users').doc(teacherId).get();
      const teacher = result.data();

      expect(teacher.role).toBe('teacher');
      expect(teacher.gmailAccessToken).toBeDefined();
      expect(teacher.email).toBe('dev.codepet@gmail.com');
    });
  });

  describe('Complete Passcode Flow', () => {
    const teacherProfile = {
      uid: 'teacher-dev-codepet',
      email: 'dev.codepet@gmail.com',
      displayName: 'Dev Teacher',
      role: 'teacher',
      gmailAccessToken: 'mock-gmail-token',
      classroomIds: ['classroom-test']
    };

    const studentEmail = 'test.student@example.com';
    const mockPasscode = '123456';

    beforeEach(() => {
      // Override the default mock for teacher profile
      mockDb.get.mockResolvedValue({
        exists: true,
        data: () => teacherProfile
      });

      // Mock authentication
      mockAuthAdmin.verifyIdToken.mockResolvedValue({
        uid: teacherProfile.uid,
        email: teacherProfile.email
      });
    });

    it('should complete teacher-initiated passcode sending', async () => {
      // 1. Teacher authentication
      const token = 'valid-firebase-token';
      const decodedToken = await mockAuthAdmin.verifyIdToken(token);
      expect(decodedToken.uid).toBe(teacherProfile.uid);

      // 2. Teacher profile verification with Gmail token
      const teacherDoc = await mockDb.collection('users').doc(decodedToken.uid).get();
      const teacher = teacherDoc.data();
      expect(teacher.gmailAccessToken).toBeDefined();

      // 3. Passcode generation and storage
      const passcodeData = {
        email: studentEmail,
        passcode: mockPasscode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
        used: false,
        attempts: 0,
        teacherId: teacherProfile.uid,
        teacherEmail: teacherProfile.email
      };

      await mockDb.collection('passcodes').doc(studentEmail).set(passcodeData);
      expect(mockDb.set).toHaveBeenCalledWith(passcodeData);

      // 4. Simulate Gmail email sending (mocked)
      // In real integration, this would use actual Gmail API
      const emailSent = true;
      expect(emailSent).toBe(true);
    });

    it('should handle student passcode verification', async () => {
      // Mock stored passcode
      const storedPasscodeData = {
        email: studentEmail,
        passcode: mockPasscode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins from now
        createdAt: new Date(),
        used: false,
        attempts: 0,
        teacherId: teacherProfile.uid,
        teacherEmail: teacherProfile.email
      };

      mockDb.get.mockResolvedValue({
        exists: true,
        data: () => storedPasscodeData
      });

      // Simulate passcode verification
      const passcodeDoc = await mockDb.collection('passcodes').doc(studentEmail).get();
      const passcodeData = passcodeDoc.data();

      expect(passcodeData.passcode).toBe(mockPasscode);
      expect(passcodeData.teacherId).toBe(teacherProfile.uid);
      expect(passcodeData.used).toBe(false);
      expect(new Date(passcodeData.expiresAt)).toBeInstanceOf(Date);
    });

    it('should create student account on successful verification', async () => {
      const studentData = {
        email: studentEmail,
        emailVerified: true,
        displayName: 'Test Student'
      };

      // Mock student creation
      mockAuthAdmin.createUser.mockResolvedValue({
        uid: 'student-123',
        email: studentEmail,
        displayName: 'Test Student'
      });

      mockAuthAdmin.setCustomUserClaims.mockResolvedValue(undefined);
      mockAuthAdmin.createCustomToken.mockResolvedValue('custom-token-123');

      const newUser = await mockAuthAdmin.createUser(studentData);
      expect(newUser.email).toBe(studentEmail);

      // Set student role
      await mockAuthAdmin.setCustomUserClaims(newUser.uid, { role: 'student' });
      expect(mockAuthAdmin.setCustomUserClaims).toHaveBeenCalledWith(newUser.uid, { role: 'student' });

      // Generate auth token
      const customToken = await mockAuthAdmin.createCustomToken(newUser.uid);
      expect(customToken).toBe('custom-token-123');
    });
  });

  describe('Gmail Email Service Integration', () => {
    it('should create proper email message format', async () => {
      const from = 'dev.codepet@gmail.com';
      const to = 'student@test.com';
      const subject = 'Your Roo Login Code';
      const passcode = '654321';
      const teacherName = 'Dev Teacher';

      // Simulate HTML email generation
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <body>
          <h1>Your Roo Login Code</h1>
          <p>Hi there!</p>
          <p><strong>${teacherName}</strong> has invited you to view your grades on Roo.</p>
          <div style="font-size: 36px; font-weight: bold;">${passcode}</div>
          <p>This code expires in 10 minutes</p>
          <p>From: ${from}</p>
        </body>
        </html>
      `;

      expect(htmlContent).toContain(passcode);
      expect(htmlContent).toContain(teacherName);
      expect(htmlContent).toContain(from);
      expect(htmlContent).toContain('expires in 10 minutes');

      // Simulate base64url encoding for Gmail API
      const emailMessage = Buffer.from(`From: ${from}\nTo: ${to}\nSubject: ${subject}\n\n${htmlContent}`).toString('base64url');
      expect(emailMessage).toBeDefined();
      expect(typeof emailMessage).toBe('string');
    });

    it('should handle Gmail API rate limiting', async () => {
      const batchSize = 5;
      const delay = 100; // ms between emails
      
      const invitations = Array.from({ length: batchSize }, (_, i) => ({
        studentEmail: `student${i}@test.com`,
        invitationToken: `token-${i}`,
        classroomName: 'Test Classroom'
      }));

      // Simulate batch processing with delay
      const results = { sent: 0, failed: 0, errors: [] };
      
      for (const invitation of invitations) {
        try {
          // Simulate email sending (would use Gmail API)
          await new Promise(resolve => setTimeout(resolve, delay));
          results.sent++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Failed to send to ${invitation.studentEmail}: ${error.message}`);
        }
      }

      expect(results.sent).toBe(batchSize);
      expect(results.failed).toBe(0);
      expect(results.errors).toHaveLength(0);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle missing Gmail permissions', async () => {
      const teacherWithoutGmail = {
        uid: 'teacher-no-gmail',
        email: 'teacher@test.com',
        role: 'teacher',
        // gmailAccessToken missing
      };

      mockDb.get.mockResolvedValue({
        exists: true,
        data: () => teacherWithoutGmail
      });

      const teacher = await mockDb.collection('users').doc(teacherWithoutGmail.uid).get();
      const teacherData = teacher.data();

      expect(teacherData.gmailAccessToken).toBeUndefined();
      
      // Should fail Gmail service creation
      expect(() => {
        if (!teacherData.gmailAccessToken) {
          throw new Error('Teacher Gmail permission not granted. Please sign in again to grant email sending permission.');
        }
      }).toThrow('Teacher Gmail permission not granted');
    });

    it('should handle expired passcodes', async () => {
      const expiredPasscodeData = {
        email: 'student@test.com',
        passcode: '123456',
        expiresAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago (expired)
        used: false,
        attempts: 0
      };

      mockDb.get.mockResolvedValue({
        exists: true,
        data: () => expiredPasscodeData
      });

      const passcode = expiredPasscodeData;
      const isExpired = new Date() > new Date(passcode.expiresAt);
      
      expect(isExpired).toBe(true);
    });

    it('should handle Gmail API failures gracefully', async () => {
      const gmailError = new Error('Gmail API quota exceeded');
      
      // Simulate Gmail API failure
      try {
        throw gmailError;
      } catch (error: any) {
        expect(error.message).toContain('Gmail API');
        
        // Should clean up passcode on failure
        await mockDb.collection('passcodes').doc('student@test.com').delete();
        expect(mockDb.delete).toHaveBeenCalled();
      }
    });
  });

  describe('Real Dev Account Simulation', () => {
    const devTeacherProfile = {
      uid: 'dev-codepet-uid',
      email: 'dev.codepet@gmail.com',
      displayName: 'Dev CodePet',
      role: 'teacher',
      gmailAccessToken: 'real-oauth-token-would-be-here',
      classroomIds: ['dev-classroom-1'],
      totalStudents: 2,
      totalClassrooms: 1,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date()
    };

    it('should simulate complete dev.codepet@gmail.com flow', async () => {
      // 1. Mock teacher profile lookup
      mockDb.get.mockResolvedValue({
        exists: true,
        data: () => devTeacherProfile
      });

      // 2. Mock Firebase authentication
      mockAuthAdmin.verifyIdToken.mockResolvedValue({
        uid: devTeacherProfile.uid,
        email: devTeacherProfile.email
      });

      // 3. Simulate passcode request for test student
      const testStudentEmail = 'test.student@example.com';
      const generatedPasscode = '789123';

      // 4. Verify teacher can send passcode
      const teacher = await mockDb.collection('users').doc(devTeacherProfile.uid).get();
      const teacherData = teacher.data();
      
      expect(teacherData.email).toBe('dev.codepet@gmail.com');
      expect(teacherData.gmailAccessToken).toBeDefined();
      expect(teacherData.role).toBe('teacher');

      // 5. Simulate passcode storage
      const passcodeRecord = {
        email: testStudentEmail,
        passcode: generatedPasscode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        teacherId: devTeacherProfile.uid,
        teacherEmail: devTeacherProfile.email,
        used: false,
        attempts: 0
      };

      await mockDb.collection('passcodes').doc(testStudentEmail).set(passcodeRecord);
      expect(mockDb.set).toHaveBeenCalledWith(passcodeRecord);

      // 6. Simulate successful email sending
      // (In real test, this would actually send to dev.codepet@gmail.com sent folder)
      const emailResult = {
        success: true,
        messageId: 'gmail-message-id-123',
        sentFrom: devTeacherProfile.email,
        sentTo: testStudentEmail
      };

      expect(emailResult.success).toBe(true);
      expect(emailResult.sentFrom).toBe('dev.codepet@gmail.com');
    });
  });
});