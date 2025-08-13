/**
 * Gmail-Enhanced Passcode Route Tests  
 * Location: functions/src/test/routes/auth-passcode-gmail.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { sendPasscode } from '../../routes/auth/passcode';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { sendStudentPasscode } from '../../services/gmail-email-service';

// Mock dependencies
vi.mock('firebase-admin/auth');
vi.mock('firebase-admin/firestore');
vi.mock('../../services/gmail-email-service');

const mockAuth = vi.mocked(getAuth);
const mockFirestore = vi.mocked(getFirestore);
const mockSendStudentPasscode = vi.mocked(sendStudentPasscode);

describe('Gmail Enhanced Passcode Route', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockDb: any;
  let mockAuthAdmin: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Firestore
    mockDb = {
      collection: vi.fn().mockReturnThis(),
      doc: vi.fn().mockReturnThis(),
      set: vi.fn(),
      delete: vi.fn()
    };
    mockFirestore.mockReturnValue(mockDb);

    // Mock Auth
    mockAuthAdmin = {
      verifyIdToken: vi.fn()
    };
    mockAuth.mockReturnValue(mockAuthAdmin);

    // Mock Request
    mockReq = {
      body: {},
      headers: {}
    };

    // Mock Response
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('Teacher Authentication Required', () => {
    it('should require authorization header', async () => {
      mockReq.body = { email: 'student@test.com' };
      mockReq.headers = {}; // No auth header

      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Teacher authentication required to send passcodes'
      });
    });

    it('should require Bearer token format', async () => {
      mockReq.body = { email: 'student@test.com' };
      mockReq.headers = { authorization: 'Invalid Token Format' };

      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Teacher authentication required to send passcodes'
      });
    });

    it('should verify Firebase ID token', async () => {
      const mockToken = 'valid-firebase-token';
      const mockDecodedToken = {
        uid: 'teacher-123',
        email: 'dev.codepet@gmail.com'
      };

      mockReq.body = { email: 'student@test.com' };
      mockReq.headers = { authorization: `Bearer ${mockToken}` };
      
      mockAuthAdmin.verifyIdToken.mockResolvedValue(mockDecodedToken);
      
      // Mock teacher profile lookup to fail (to stop execution)
      mockDb.get = vi.fn().mockResolvedValue({ exists: false });

      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockAuthAdmin.verifyIdToken).toHaveBeenCalledWith(mockToken);
    });

    it('should handle invalid/expired tokens', async () => {
      const mockToken = 'invalid-token';

      mockReq.body = { email: 'student@test.com' };
      mockReq.headers = { authorization: `Bearer ${mockToken}` };
      
      mockAuthAdmin.verifyIdToken.mockRejectedValue({
        code: 'auth/id-token-expired',
        message: 'Token expired'
      });

      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token'
      });
    });
  });

  describe('Teacher Role Verification', () => {
    const mockValidToken = 'valid-token';
    const mockDecodedToken = {
      uid: 'teacher-123',
      email: 'dev.codepet@gmail.com'
    };

    beforeEach(() => {
      mockReq.body = { email: 'student@test.com' };
      mockReq.headers = { authorization: `Bearer ${mockValidToken}` };
      mockAuthAdmin.verifyIdToken.mockResolvedValue(mockDecodedToken);
    });

    it('should check if teacher profile exists', async () => {
      mockDb.get = vi.fn().mockResolvedValue({ exists: false });

      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockDb.doc).toHaveBeenCalledWith(mockDecodedToken.uid);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'Only teachers can send student passcodes'
      });
    });

    it('should verify teacher role', async () => {
      const mockTeacherData = {
        email: 'dev.codepet@gmail.com',
        role: 'student', // Wrong role
        gmailAccessToken: 'token'
      };

      mockDb.get = vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockTeacherData
      });

      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'Only teachers can send student passcodes'
      });
    });

    it('should require Gmail access token', async () => {
      const mockTeacherData = {
        email: 'dev.codepet@gmail.com',
        role: 'teacher',
        // gmailAccessToken missing
      };

      mockDb.get = vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockTeacherData
      });

      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Gmail access required',
        message: 'Please sign in with Google to enable email sending'
      });
    });
  });

  describe('Successful Passcode Sending', () => {
    const mockValidToken = 'valid-token';
    const mockDecodedToken = {
      uid: 'teacher-123',
      email: 'dev.codepet@gmail.com'
    };
    const mockTeacherData = {
      email: 'dev.codepet@gmail.com',
      displayName: 'Dev Teacher',
      role: 'teacher',
      gmailAccessToken: 'mock-gmail-token'
    };

    beforeEach(() => {
      mockReq.body = { email: 'student@test.com' };
      mockReq.headers = { authorization: `Bearer ${mockValidToken}` };
      mockAuthAdmin.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockDb.get = vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockTeacherData
      });
      mockSendStudentPasscode.mockResolvedValue(undefined);
    });

    it('should generate and store passcode', async () => {
      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'student@test.com',
          passcode: expect.stringMatching(/^\d{6}$/), // 6-digit code
          used: false,
          attempts: 0,
          teacherId: mockDecodedToken.uid,
          teacherEmail: mockTeacherData.email
        })
      );
    });

    it('should send passcode via Gmail', async () => {
      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockSendStudentPasscode).toHaveBeenCalledWith(
        mockDecodedToken.uid,
        'student@test.com',
        expect.stringMatching(/^\d{6}$/)
      );
    });

    it('should return success response', async () => {
      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          email: 'student@test.com',
          sent: true,
          message: 'Passcode sent to student@test.com from your Gmail account',
          sentFrom: mockTeacherData.email
          // Note: passcode only included in development environment (see Development Environment tests)
        }
      });
    });

    it('should handle email sending failures', async () => {
      mockSendStudentPasscode.mockRejectedValue(new Error('Gmail API Error'));

      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockDb.delete).toHaveBeenCalled(); // Should delete passcode on failure
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email sending failed',
        message: 'Failed to send passcode email. Please check your Gmail permissions and try again.'
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      mockReq.body = { email: 'invalid-email' };
      mockReq.headers = { authorization: 'Bearer token' };

      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        details: expect.any(Array)
      });
      
      // Check that the validation error contains email-related message
      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.details.some((detail: any) => 
        detail.message && detail.message.toLowerCase().includes('email')
      )).toBe(true);
    });

    it('should require email field', async () => {
      mockReq.body = {}; // Missing email
      mockReq.headers = { authorization: 'Bearer token' };

      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        details: expect.any(Array)
      });
      
      // Check that the validation error mentions email field is required
      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.details.some((detail: any) => 
        detail.path && detail.path.includes('email')
      )).toBe(true);
    });
  });

  describe('Development Environment', () => {
    it('should include passcode in development response', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockValidToken = 'valid-token';
      const mockDecodedToken = { uid: 'teacher-123', email: 'dev.codepet@gmail.com' };
      const mockTeacherData = {
        email: 'dev.codepet@gmail.com',
        role: 'teacher',
        gmailAccessToken: 'token'
      };

      mockReq.body = { email: 'student@test.com' };
      mockReq.headers = { authorization: `Bearer ${mockValidToken}` };
      mockAuthAdmin.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockDb.get = vi.fn().mockResolvedValue({ exists: true, data: () => mockTeacherData });
      mockSendStudentPasscode.mockResolvedValue(undefined);

      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            passcode: expect.stringMatching(/^\d{6}$/)
          })
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include passcode in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockValidToken = 'valid-token';
      const mockDecodedToken = { uid: 'teacher-123', email: 'dev.codepet@gmail.com' };
      const mockTeacherData = {
        email: 'dev.codepet@gmail.com',
        role: 'teacher',
        gmailAccessToken: 'token'
      };

      mockReq.body = { email: 'student@test.com' };
      mockReq.headers = { authorization: `Bearer ${mockValidToken}` };
      mockAuthAdmin.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockDb.get = vi.fn().mockResolvedValue({ exists: true, data: () => mockTeacherData });
      mockSendStudentPasscode.mockResolvedValue(undefined);

      await sendPasscode(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.not.objectContaining({
            passcode: expect.any(String)
          })
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });
});