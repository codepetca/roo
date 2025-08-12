/**
 * Gmail Email Service for Sending Student Communications
 * Location: functions/src/services/gmail-email-service.ts
 */

import { google, gmail_v1 } from 'googleapis';
import { getFirestore } from 'firebase-admin/firestore';

export class GmailEmailService {
  private gmail: gmail_v1.Gmail;

  constructor(private accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: accessToken
    });

    this.gmail = google.gmail({ version: 'v1', auth });
  }

  /**
   * Send passcode email to student
   */
  async sendPasscodeEmail(
    teacherEmail: string,
    studentEmail: string,
    passcode: string,
    teacherName: string
  ): Promise<void> {
    try {
      const subject = 'Your Roo Login Code';
      const htmlBody = this.createPasscodeEmailHTML(passcode, teacherName, teacherEmail);
      
      const message = this.createEmailMessage(teacherEmail, studentEmail, subject, htmlBody);

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message
        }
      });

      console.log(`Passcode email sent: ${teacherEmail} -> ${studentEmail}`);
    } catch (error: any) {
      console.error('Gmail send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send classroom invitation email to student
   */
  async sendInvitationEmail(
    teacherEmail: string,
    studentEmail: string,
    invitationToken: string,
    classroomName: string,
    teacherName: string
  ): Promise<void> {
    try {
      const subject = `Welcome to ${classroomName} on Roo!`;
      const htmlBody = this.createInvitationEmailHTML(invitationToken, classroomName, teacherName, teacherEmail);
      
      const message = this.createEmailMessage(teacherEmail, studentEmail, subject, htmlBody);

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message
        }
      });

      console.log(`Invitation email sent: ${teacherEmail} -> ${studentEmail}`);
    } catch (error: any) {
      console.error('Gmail invitation send error:', error);
      throw new Error(`Failed to send invitation: ${error.message}`);
    }
  }

  /**
   * Create HTML email template for passcode
   */
  private createPasscodeEmailHTML(passcode: string, teacherName: string, teacherEmail: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .passcode { background: #f1f5f9; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .passcode-number { font-size: 36px; font-weight: bold; color: #1e293b; letter-spacing: 4px; margin: 10px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          .warning { background: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 15px 0; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Roo Login Code</h1>
          </div>
          <div class="content">
            <p>Hi there!</p>
            <p><strong>${teacherName}</strong> has invited you to view your grades on Roo.</p>
            
            <div class="passcode">
              <p style="margin: 0; font-weight: 600; color: #475569;">Your login code is:</p>
              <div class="passcode-number">${passcode}</div>
            </div>

            <div class="warning">
              ⏰ This code expires in 10 minutes
            </div>

            <p>Use this code to sign in and access your assignments and grades.</p>
            
            <p style="margin-top: 30px;">
              <strong>From:</strong> ${teacherEmail}<br>
              <strong>Subject:</strong> Access Your Grades
            </p>
          </div>
          <div class="footer">
            <p>This email was sent from your teacher's Gmail account via Roo.</p>
            <p>If you have questions, reply to this email to contact ${teacherName}.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Create HTML email template for classroom invitation
   */
  private createInvitationEmailHTML(
    invitationToken: string, 
    classroomName: string, 
    teacherName: string,
    teacherEmail: string
  ): string {
    const inviteUrl = `https://roo-app.web.app/invite/${invitationToken}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
          .warning { background: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 15px 0; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Roo!</h1>
          </div>
          <div class="content">
            <p>Hi there!</p>
            <p><strong>${teacherName}</strong> has invited you to join <strong>${classroomName}</strong> on Roo.</p>
            
            <p>Click the button below to accept your invitation and access your assignments:</p>
            
            <p style="text-align: center;">
              <a href="${inviteUrl}" class="button">Join ${classroomName}</a>
            </p>

            <div class="warning">
              ⏰ This invitation expires in 7 days
            </div>

            <p>Once you join, you'll be able to:</p>
            <ul>
              <li>View your assignment grades and feedback</li>
              <li>Submit assignments and quizzes</li>
              <li>Track your progress throughout the course</li>
            </ul>
            
            <p style="margin-top: 30px;">
              <strong>From:</strong> ${teacherEmail}<br>
              <strong>Teacher:</strong> ${teacherName}<br>
              <strong>Classroom:</strong> ${classroomName}
            </p>
          </div>
          <div class="footer">
            <p>This invitation was sent from your teacher's Gmail account via Roo.</p>
            <p>If you have questions, reply to this email to contact ${teacherName}.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Create base64url encoded email message for Gmail API
   */
  private createEmailMessage(from: string, to: string, subject: string, html: string): string {
    const message = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      html
    ].join('\n');

    return Buffer.from(message).toString('base64url');
  }
}

/**
 * Create Gmail service instance for a teacher
 */
export async function createGmailServiceForTeacher(teacherId: string): Promise<GmailEmailService> {
  const db = getFirestore();
  const teacherDoc = await db.collection('users').doc(teacherId).get();
  
  if (!teacherDoc.exists) {
    throw new Error(`Teacher not found: ${teacherId}`);
  }

  const teacherData = teacherDoc.data();
  if (!teacherData?.gmailAccessToken) {
    throw new Error('Teacher Gmail permission not granted. Please sign in again to grant email sending permission.');
  }

  return new GmailEmailService(teacherData.gmailAccessToken);
}

/**
 * Send passcode to student via teacher's Gmail
 */
export async function sendStudentPasscode(
  teacherId: string,
  studentEmail: string,
  passcode: string
): Promise<void> {
  const db = getFirestore();
  const teacherDoc = await db.collection('users').doc(teacherId).get();
  
  if (!teacherDoc.exists) {
    throw new Error('Teacher not found');
  }

  const teacherData = teacherDoc.data()!;
  const gmailService = await createGmailServiceForTeacher(teacherId);
  
  await gmailService.sendPasscodeEmail(
    teacherData.email,
    studentEmail,
    passcode,
    teacherData.displayName || 'Your Teacher'
  );
}