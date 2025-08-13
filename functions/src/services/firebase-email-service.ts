/**
 * Firebase Email Service for Sending Student Communications
 * Location: functions/src/services/firebase-email-service.ts
 * 
 * Uses Firebase Auth's built-in email sending capabilities
 * which have better deliverability than OAuth-based Gmail API
 */

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export class FirebaseEmailService {
  private auth = getAuth();
  private db = getFirestore();

  /**
   * Store passcode for later validation
   * This replaces the actual email sending with in-app storage
   */
  async storePasscode(
    email: string,
    passcode: string,
    expiresAt: Date,
    teacherId?: string
  ): Promise<void> {
    try {
      // Store the passcode in Firestore for validation
      await this.db.collection('passcodes').doc(email).set({
        email,
        passcode,
        expiresAt,
        teacherId,
        createdAt: new Date(),
        used: false
      });

      logger.info(`Passcode stored for ${email}`, { email, teacherId });
    } catch (error: any) {
      logger.error('Failed to store passcode:', error);
      throw new Error(`Failed to store passcode: ${error.message}`);
    }
  }

  /**
   * Send passcode email via Firebase (future implementation)
   * Currently, Firebase doesn't directly support custom email templates,
   * but we can use Firebase Extensions or third-party services
   */
  async sendPasscodeViaFirebase(
    studentEmail: string,
    passcode: string,
    teacherEmail?: string
  ): Promise<void> {
    try {
      // For now, we'll just store the passcode
      // In production, you would:
      // 1. Use Firebase Extensions (Trigger Email from Firestore)
      // 2. Or integrate with SendGrid/Mailgun via Firebase Functions
      // 3. Or use Firebase Auth's email link authentication
      
      logger.info(`Firebase email service called`, { 
        studentEmail, 
        teacherEmail,
        method: 'firebase-auth'
      });

      // Store passcode for validation
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await this.storePasscode(studentEmail, passcode, expiresAt);

      // In a real implementation, you would trigger an email here
      // For example, using Firestore trigger with Email Extension:
      /*
      await this.db.collection('mail').add({
        to: studentEmail,
        from: 'noreply@roo-app-3d24e.firebaseapp.com',
        message: {
          subject: 'Your Roo Login Code',
          html: this.createPasscodeEmailHTML(passcode, teacherEmail),
        },
      });
      */

      logger.info(`Passcode ready for ${studentEmail}`, { 
        email: studentEmail,
        storedSuccessfully: true 
      });
    } catch (error: any) {
      logger.error('Firebase email service error:', error);
      throw new Error(`Failed to process passcode: ${error.message}`);
    }
  }

  /**
   * Validate a passcode
   */
  async validatePasscode(email: string, passcode: string): Promise<boolean> {
    try {
      const doc = await this.db.collection('passcodes').doc(email).get();
      
      if (!doc.exists) {
        return false;
      }

      const data = doc.data()!;
      const now = new Date();
      const expiresAt = data.expiresAt.toDate();

      // Check if passcode matches, hasn't expired, and hasn't been used
      if (data.passcode === passcode && 
          expiresAt > now && 
          !data.used) {
        
        // Mark as used
        await doc.ref.update({ used: true, usedAt: now });
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('Passcode validation error:', error);
      return false;
    }
  }

  /**
   * Create HTML email template for passcode
   */
  private createPasscodeEmailHTML(passcode: string, teacherEmail?: string): string {
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Roo Login Code</h1>
          </div>
          <div class="content">
            <p>Hi there!</p>
            <p>Your teacher has sent you a login code to access your grades on Roo.</p>
            
            <div class="passcode">
              <p style="margin: 0; font-weight: 600; color: #475569;">Your login code is:</p>
              <div class="passcode-number">${passcode}</div>
            </div>

            <p>⏰ This code expires in 10 minutes</p>
            <p>Use this code to sign in at: <a href="https://roo-app.web.app/student">roo-app.web.app/student</a></p>
            
            ${teacherEmail ? `<p style="margin-top: 20px;"><small>Sent by: ${teacherEmail}</small></p>` : ''}
          </div>
          <div class="footer">
            <p>This email was sent from Roo's verified domain.</p>
            <p>If you have questions, contact your teacher.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

/**
 * Create Firebase email service instance
 */
export function createFirebaseEmailService(): FirebaseEmailService {
  return new FirebaseEmailService();
}