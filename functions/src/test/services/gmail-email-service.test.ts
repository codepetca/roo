/**
 * Gmail Email Service Tests
 * Location: functions/src/test/services/gmail-email-service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GmailEmailService, createGmailServiceForTeacher, sendStudentPasscode } from '../../services/gmail-email-service';
import { getFirestore } from 'firebase-admin/firestore';

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore');
const mockFirestore = vi.mocked(getFirestore);

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn()
      }))
    },
    gmail: vi.fn().mockImplementation(() => ({
      users: {
        messages: {
          send: vi.fn().mockResolvedValue({ data: { id: 'mock-message-id' } })
        }
      }
    }))
  }
}));

describe('GmailEmailService', () => {
  let gmailService: GmailEmailService;
  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    vi.clearAllMocks();
    gmailService = new GmailEmailService(mockAccessToken);
  });

  describe('Initialization', () => {
    it('should initialize with access token', () => {
      expect(gmailService).toBeDefined();
    });
  });

  describe('sendPasscodeEmail', () => {
    it('should send passcode email successfully', async () => {
      const teacherEmail = 'dev.codepet@gmail.com';
      const studentEmail = 'student@example.com';
      const passcode = '123456';
      const teacherName = 'Test Teacher';

      await gmailService.sendPasscodeEmail(teacherEmail, studentEmail, passcode, teacherName);

      // Verify Gmail API was called
      expect(gmailService['gmail'].users.messages.send).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: { raw: expect.any(String) }
      });
    });

    it('should generate correct HTML email template', async () => {
      const passcode = '654321';
      const teacherName = 'Dev Teacher';
      const teacherEmail = 'dev.codepet@gmail.com';

      const htmlContent = gmailService['createPasscodeEmailHTML'](passcode, teacherName, teacherEmail);

      expect(htmlContent).toContain(passcode);
      expect(htmlContent).toContain(teacherName);
      expect(htmlContent).toContain(teacherEmail);
      expect(htmlContent).toContain('Your Roo Login Code');
      expect(htmlContent).toContain('This code expires in 10 minutes');
    });

    it('should handle email sending errors', async () => {
      // Mock Gmail API to throw error
      gmailService['gmail'].users.messages.send = vi.fn().mockRejectedValue(new Error('Gmail API Error'));

      await expect(
        gmailService.sendPasscodeEmail('teacher@test.com', 'student@test.com', '123456', 'Teacher')
      ).rejects.toThrow('Failed to send email: Gmail API Error');
    });
  });

  describe('sendInvitationEmail', () => {
    it('should send invitation email successfully', async () => {
      const teacherEmail = 'dev.codepet@gmail.com';
      const studentEmail = 'student@example.com';
      const invitationToken = 'invitation-token-123';
      const classroomName = 'Test Classroom';
      const teacherName = 'Test Teacher';

      await gmailService.sendInvitationEmail(
        teacherEmail, 
        studentEmail, 
        invitationToken, 
        classroomName, 
        teacherName
      );

      // Verify Gmail API was called
      expect(gmailService['gmail'].users.messages.send).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: { raw: expect.any(String) }
      });
    });

    it('should generate correct invitation HTML template', async () => {
      const invitationToken = 'token-123';
      const classroomName = 'Advanced Programming';
      const teacherName = 'Prof. Smith';
      const teacherEmail = 'prof.smith@school.edu';

      const htmlContent = gmailService['createInvitationEmailHTML'](
        invitationToken, 
        classroomName, 
        teacherName, 
        teacherEmail
      );

      expect(htmlContent).toContain(classroomName);
      expect(htmlContent).toContain(teacherName);
      expect(htmlContent).toContain(teacherEmail);
      expect(htmlContent).toContain('Welcome to Roo!');
      expect(htmlContent).toContain('invitation expires in 7 days');
    });
  });

  describe('createEmailMessage', () => {
    it('should create properly formatted email message', () => {
      const from = 'teacher@test.com';
      const to = 'student@test.com';
      const subject = 'Test Subject';
      const html = '<html><body>Test Body</body></html>';

      const message = gmailService['createEmailMessage'](from, to, subject, html);
      
      // Decode base64url to verify content
      const decodedMessage = Buffer.from(message, 'base64url').toString();
      
      expect(decodedMessage).toContain(`From: ${from}`);
      expect(decodedMessage).toContain(`To: ${to}`);
      expect(decodedMessage).toContain(`Subject: ${subject}`);
      expect(decodedMessage).toContain(html);
      expect(decodedMessage).toContain('Content-Type: text/html; charset=utf-8');
    });
  });
});

describe('createGmailServiceForTeacher', () => {
  const mockDb = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestore.mockReturnValue(mockDb as any);
  });

  it('should create Gmail service with teacher access token', async () => {
    const teacherId = 'teacher-123';
    const mockTeacherData = {
      email: 'dev.codepet@gmail.com',
      displayName: 'Dev Teacher',
      gmailAccessToken: 'mock-access-token'
    };

    mockDb.get.mockResolvedValue({
      exists: true,
      data: () => mockTeacherData
    });

    const service = await createGmailServiceForTeacher(teacherId);

    expect(service).toBeInstanceOf(GmailEmailService);
    expect(mockDb.collection).toHaveBeenCalledWith('users');
    expect(mockDb.doc).toHaveBeenCalledWith(teacherId);
  });

  it('should throw error for non-existent teacher', async () => {
    const teacherId = 'non-existent-teacher';

    mockDb.get.mockResolvedValue({
      exists: false
    });

    await expect(createGmailServiceForTeacher(teacherId))
      .rejects.toThrow(`Teacher not found: ${teacherId}`);
  });

  it('should throw error for teacher without Gmail token', async () => {
    const teacherId = 'teacher-no-gmail';
    const mockTeacherData = {
      email: 'teacher@test.com',
      displayName: 'Teacher Without Gmail',
      // gmailAccessToken is missing
    };

    mockDb.get.mockResolvedValue({
      exists: true,
      data: () => mockTeacherData
    });

    await expect(createGmailServiceForTeacher(teacherId))
      .rejects.toThrow('Teacher Gmail permission not granted. Please sign in again to grant email sending permission.');
  });
});

describe('sendStudentPasscode', () => {
  const mockDb = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestore.mockReturnValue(mockDb as any);
  });

  it('should send student passcode successfully', async () => {
    const teacherId = 'teacher-123';
    const studentEmail = 'student@test.com';
    const passcode = '123456';
    
    const mockTeacherData = {
      email: 'dev.codepet@gmail.com',
      displayName: 'Dev Teacher',
      gmailAccessToken: 'mock-access-token'
    };

    mockDb.get.mockResolvedValue({
      exists: true,
      data: () => mockTeacherData
    });

    // Mock the GmailEmailService.sendPasscodeEmail method
    const mockSendPasscodeEmail = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../services/gmail-email-service', () => ({
      ...vi.importActual('../../services/gmail-email-service'),
      GmailEmailService: vi.fn().mockImplementation(() => ({
        sendPasscodeEmail: mockSendPasscodeEmail
      }))
    }));

    await sendStudentPasscode(teacherId, studentEmail, passcode);

    expect(mockDb.collection).toHaveBeenCalledWith('users');
    expect(mockDb.doc).toHaveBeenCalledWith(teacherId);
  });

  it('should handle missing teacher', async () => {
    const teacherId = 'non-existent';
    const studentEmail = 'student@test.com';
    const passcode = '123456';

    mockDb.get.mockResolvedValue({
      exists: false
    });

    await expect(sendStudentPasscode(teacherId, studentEmail, passcode))
      .rejects.toThrow('Teacher not found');
  });
});