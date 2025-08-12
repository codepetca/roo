/**
 * Gmail Email Service - Send emails via teacher's personal Gmail account
 * @module functions/src/services/gmail-email-service
 * @description Uses teacher's Gmail OAuth token to send passcodes and invitations
 * @dependencies googleapis, firebase-admin/firestore
 */

import { google, gmail_v1 } from 'googleapis';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export interface EmailRequest {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export class GmailEmailService {
  private gmail: gmail_v1.Gmail;

  constructor(private accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: this.accessToken });
    
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  /**
   * Send passcode email to student via teacher's Gmail
   */
  async sendPasscodeEmail(
    teacherEmail: string,
    studentEmail: string,
    passcode: string,
    teacherName: string
  ): Promise<void> {
    const subject = 'Your Roo Login Code';
    const htmlContent = this.createPasscodeEmailHTML(passcode, teacherName, teacherEmail);
    
    const message = this.createEmailMessage(
      teacherEmail,
      studentEmail,
      subject,
      htmlContent
    );
    
    try {
      const result = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: message }
      });
      
      logger.info('Passcode email sent successfully', {
        teacherEmail,
        studentEmail,
        messageId: result.data.id,
        passcode: '***hidden***' // Don't log actual passcode
      });
      
    } catch (error: any) {
      logger.error('Failed to send passcode email', {
        teacherEmail,
        studentEmail,
        error: error.message,
        errorCode: error.code
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send invitation email to student via teacher's Gmail
   */
  async sendInvitationEmail(
    teacherEmail: string,
    studentEmail: string,
    invitationToken: string,
    classroomName: string,
    teacherName: string
  ): Promise<void> {
    const subject = `You're invited to join ${classroomName} on Roo`;
    const htmlContent = this.createInvitationEmailHTML(
      invitationToken, 
      classroomName, 
      teacherName, 
      teacherEmail
    );
    
    const message = this.createEmailMessage(
      teacherEmail,
      studentEmail,
      subject,
      htmlContent
    );
    
    try {
      const result = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: message }
      });
      
      logger.info('Invitation email sent successfully', {
        teacherEmail,
        studentEmail,
        classroomName,
        messageId: result.data.id
      });
      
    } catch (error: any) {
      logger.error('Failed to send invitation email', {
        teacherEmail,
        studentEmail,
        classroomName,
        error: error.message,
        errorCode: error.code
      });
      throw new Error(`Failed to send invitation: ${error.message}`);
    }
  }

  /**
   * Create Gmail message format
   */
  private createEmailMessage(
    from: string,
    to: string,
    subject: string,
    html: string
  ): string {
    const email = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      html
    ].join('\n');
    
    return Buffer.from(email).toString('base64url');
  }

  /**
   * Create HTML template for passcode email
   */
  private createPasscodeEmailHTML(
    passcode: string, 
    teacherName: string, 
    teacherEmail: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Roo Login Code</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Roo</h1>
            <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Your Login Code</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 20px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">Hi there!</p>
            <p style="margin: 0 0 25px 0; font-size: 16px; color: #374151; line-height: 1.5;">
              <strong>${teacherName}</strong> has invited you to view your grades on Roo.
            </p>
            
            <!-- Passcode Box -->
            <div style="background: #f3f4f6; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; border: 2px dashed #d1d5db;">
              <div style="font-size: 36px; font-weight: 800; color: #2563eb; letter-spacing: 6px; font-family: 'Courier New', monospace;">
                ${passcode}
              </div>
              <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 14px; font-weight: 500;">
                ⏰ This code expires in 10 minutes
              </p>
            </div>
            
            <!-- Instructions -->
            <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">How to use your code:</h3>
              <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
                <li>Visit the Roo login page</li>
                <li>Enter your email address</li>
                <li>Enter the 6-digit code above</li>
                <li>Access your grades and feedback</li>
              </ol>
            </div>
            
            <!-- Login Button -->
            <div style="text-align: center; margin: 30px 0 20px 0;">
              <a href="${process.env.FRONTEND_BASE_URL || 'https://your-app-url.com'}/students/login" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Access Your Grades
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.4;">
              📧 This email was sent by <strong>${teacherName}</strong> (${teacherEmail}) through Roo.<br>
              If you didn't expect this email, please contact your teacher directly.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Create HTML template for invitation email
   */
  private createInvitationEmailHTML(
    invitationToken: string,
    classroomName: string,
    teacherName: string,
    teacherEmail: string
  ): string {
    const registrationUrl = `${process.env.FRONTEND_BASE_URL || 'https://your-app-url.com'}/students/join/${invitationToken}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Join ${classroomName} on Roo</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">📚 Welcome to Roo!</h1>
            <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">You're Invited</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 20px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">Hi there!</p>
            <p style="margin: 0 0 25px 0; font-size: 16px; color: #374151; line-height: 1.5;">
              <strong>${teacherName}</strong> has invited you to join <strong>${classroomName}</strong> on Roo 
              to view your assignments, grades, and feedback.
            </p>
            
            <!-- Classroom Info -->
            <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #10b981;">
              <h3 style="margin: 0 0 10px 0; color: #059669; font-size: 18px;">🎓 ${classroomName}</h3>
              <p style="margin: 0; color: #374151; font-size: 14px;">
                Teacher: ${teacherName}<br>
                Platform: Roo Grading System
              </p>
            </div>
            
            <!-- Benefits -->
            <div style="margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">What you'll get:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
                <li>📊 View your grades and scores</li>
                <li>🤖 Detailed AI feedback on your work</li>
                <li>📈 Track your progress over time</li>
                <li>💬 Ask questions about your grades</li>
              </ul>
            </div>
            
            <!-- Join Button -->
            <div style="text-align: center; margin: 30px 0 20px 0;">
              <a href="${registrationUrl}" 
                 style="display: inline-block; background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Join ${classroomName}
              </a>
            </div>
            
            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
              This invitation expires in 7 days
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.4;">
              📧 This invitation was sent by <strong>${teacherName}</strong> (${teacherEmail}) through Roo.<br>
              If you have questions, please contact your teacher directly.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

/**
 * Factory function to create Gmail service for a specific teacher
 */
export async function createGmailServiceForTeacher(teacherId: string): Promise<GmailEmailService> {
  const db = getFirestore();
  
  // Get teacher's stored access token
  const teacherDoc = await db.collection('users').doc(teacherId).get();
  
  if (!teacherDoc.exists) {
    throw new Error(`Teacher not found: ${teacherId}`);
  }
  
  const teacher = teacherDoc.data()!;
  const accessToken = teacher.gmailAccessToken;
  
  if (!accessToken) {
    throw new Error('Teacher Gmail permission not granted. Please sign in again to grant email sending permission.');
  }
  
  return new GmailEmailService(accessToken);
}

/**
 * Send student passcode via teacher's Gmail
 */
export async function sendStudentPasscode(
  teacherId: string,
  studentEmail: string,
  passcode: string
): Promise<void> {
  const db = getFirestore();
  
  // Get teacher info
  const teacherDoc = await db.collection('users').doc(teacherId).get();
  if (!teacherDoc.exists) {
    throw new Error('Teacher not found');
  }
  
  const teacher = teacherDoc.data()!;
  const teacherName = teacher.displayName || teacher.email?.split('@')[0] || 'Your Teacher';
  
  // Create Gmail service and send email
  const gmailService = await createGmailServiceForTeacher(teacherId);
  await gmailService.sendPasscodeEmail(
    teacher.email,
    studentEmail,
    passcode,
    teacherName
  );
  
  logger.info('Student passcode sent successfully', {
    teacherId,
    teacherEmail: teacher.email,
    studentEmail,
    teacherName
  });
}

/**
 * Send bulk student invitations via teacher's Gmail
 */
export async function sendStudentInvitations(
  teacherId: string,
  invitations: Array<{
    studentEmail: string;
    invitationToken: string;
    classroomName: string;
  }>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const db = getFirestore();
  
  // Get teacher info
  const teacherDoc = await db.collection('users').doc(teacherId).get();
  if (!teacherDoc.exists) {
    throw new Error('Teacher not found');
  }
  
  const teacher = teacherDoc.data()!;
  const teacherName = teacher.displayName || teacher.email?.split('@')[0] || 'Your Teacher';
  
  // Create Gmail service
  const gmailService = await createGmailServiceForTeacher(teacherId);
  
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  
  // Send invitations with delay to avoid rate limiting
  for (const invitation of invitations) {
    try {
      await gmailService.sendInvitationEmail(
        teacher.email,
        invitation.studentEmail,
        invitation.invitationToken,
        invitation.classroomName,
        teacherName
      );
      sent++;
      
      // Small delay between emails to be respectful to Gmail API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      failed++;
      errors.push(`Failed to send to ${invitation.studentEmail}: ${error.message}`);
      logger.error('Failed to send invitation', {
        studentEmail: invitation.studentEmail,
        error: error.message
      });
    }
  }
  
  logger.info('Bulk invitations completed', {
    teacherId,
    total: invitations.length,
    sent,
    failed
  });
  
  return { sent, failed, errors };
}