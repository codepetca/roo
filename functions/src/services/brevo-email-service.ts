/**
 * Brevo Email Service for Sending Student Communications
 * Location: functions/src/services/brevo-email-service.ts
 * 
 * Uses Brevo (formerly Sendinblue) for professional email delivery
 * Better deliverability than Gmail API, no OAuth requirements
 */

// Using require instead of import for better compatibility
const brevo = require('@getbrevo/brevo');
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export class BrevoEmailService {
  private brevoApi: any;
  private db = getFirestore();

  constructor(apiKey: string) {
    // Initialize Brevo API client with direct configuration
    this.brevoApi = new brevo.TransactionalEmailsApi();
    
    // Set API key directly on the instance
    this.brevoApi.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  }

  /**
   * Generate and send passcode to student
   * Returns success/failure without exposing the actual passcode
   */
  async generateAndSendPasscode(
    studentEmail: string,
    teacherEmail?: string,
    teacherName?: string
  ): Promise<{
    success: boolean;
    message: string;
    sentTo: string;
  }> {
    try {
      // 1. Generate 6-digit passcode
      const passcode = this.generatePasscode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      logger.info('Generating passcode for student', { 
        studentEmail, 
        teacherEmail,
        expiresAt: expiresAt.toISOString()
      });

      // 2. Store in Firestore for validation
      await this.storePasscode(studentEmail, passcode, expiresAt, teacherEmail);

      // 3. Send via Brevo
      await this.sendPasscodeEmail(studentEmail, passcode, teacherEmail, teacherName);

      // 4. Return success (no passcode in response for security)
      return {
        success: true,
        message: 'Login code sent successfully',
        sentTo: studentEmail
      };

    } catch (error: any) {
      logger.error('Failed to generate and send passcode:', error);
      throw new Error(`Failed to send login code: ${error.message}`);
    }
  }

  /**
   * Generate a random 6-digit passcode
   */
  private generatePasscode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Store passcode in Firestore for later validation
   */
  private async storePasscode(
    email: string,
    passcode: string,
    expiresAt: Date,
    teacherEmail?: string
  ): Promise<void> {
    try {
      await this.db.collection('passcodes').doc(email).set({
        email,
        passcode,
        expiresAt,
        teacherEmail,
        createdAt: new Date(),
        used: false
      });

      logger.info(`Passcode stored for validation`, { email, teacherEmail });
    } catch (error: any) {
      logger.error('Failed to store passcode:', error);
      throw new Error(`Failed to store passcode: ${error.message}`);
    }
  }

  /**
   * Send passcode email via Brevo
   */
  private async sendPasscodeEmail(
    studentEmail: string,
    passcode: string,
    teacherEmail?: string,
    teacherName?: string
  ): Promise<void> {
    try {
      const emailData: any = {
        to: [{ email: studentEmail }],
        sender: { 
          email: 'dev.codepet@gmail.com', // Your verified Brevo sender
          name: 'Roo Auto-Grading System'
        },
        subject: 'Your Roo Login Code',
        htmlContent: this.createPasscodeEmailHTML(passcode, teacherEmail, teacherName)
      };

      // Add reply-to if teacher email provided
      if (teacherEmail) {
        emailData.replyTo = { email: teacherEmail };
      }

      const result = await this.brevoApi.sendTransacEmail(emailData);
      
      logger.info('Passcode email sent successfully', {
        studentEmail,
        messageId: result.response.messageId,
        teacherEmail
      });

    } catch (error: any) {
      logger.error('Brevo email send error:', error);
      throw new Error(`Failed to send email via Brevo: ${error.message}`);
    }
  }

  /**
   * Validate a passcode (called during student login)
   */
  async validatePasscode(email: string, passcode: string): Promise<boolean> {
    try {
      const doc = await this.db.collection('passcodes').doc(email).get();
      
      if (!doc.exists) {
        logger.warn('Passcode validation - no record found', { email });
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
        
        logger.info('Passcode validation successful', { email });
        return true;
      }

      logger.warn('Passcode validation failed', { 
        email, 
        expired: expiresAt <= now,
        used: data.used,
        matches: data.passcode === passcode
      });
      
      return false;
    } catch (error: any) {
      logger.error('Passcode validation error:', error);
      return false;
    }
  }

  /**
   * Create HTML email template for passcode
   */
  private createPasscodeEmailHTML(
    passcode: string, 
    teacherEmail?: string, 
    teacherName?: string
  ): string {
    const teacher = teacherName || teacherEmail || 'Your teacher';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Your Roo Login Code</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f8f9fa; 
            line-height: 1.6;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 8px; 
            overflow: hidden; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content { 
            padding: 30px; 
          }
          .passcode-box { 
            background: #f1f5f9; 
            border: 2px solid #e2e8f0; 
            border-radius: 12px; 
            padding: 25px; 
            margin: 25px 0; 
            text-align: center; 
          }
          .passcode-label {
            font-size: 14px;
            color: #64748b;
            margin: 0 0 15px 0;
            font-weight: 600;
          }
          .passcode-number { 
            font-size: 42px; 
            font-weight: bold; 
            color: #1e293b; 
            letter-spacing: 8px; 
            margin: 10px 0; 
            font-family: 'Courier New', monospace;
          }
          .warning { 
            background: #fef3cd; 
            border-left: 4px solid #f59e0b; 
            border-radius: 6px; 
            padding: 15px; 
            margin: 20px 0; 
            color: #92400e; 
          }
          .footer { 
            background: #f8f9fa; 
            padding: 25px; 
            text-align: center; 
            color: #64748b; 
            font-size: 14px; 
          }
          .login-url {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 15px 0;
            font-weight: 600;
          }
          .teacher-info {
            background: #f1f5f9;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #475569;
          }
          .instructions {
            background: #ecfccb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .step {
            display: flex;
            align-items: flex-start;
            margin: 10px 0;
          }
          .step-number {
            background: #22c55e;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            margin-right: 12px;
            flex-shrink: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Your Roo Login Code</h1>
          </div>
          
          <div class="content">
            <p>Hi there!</p>
            <p><strong>${teacher}</strong> has sent you a login code to access your grades and assignments on Roo.</p>
            
            <div class="passcode-box">
              <p class="passcode-label">Your 6-digit login code:</p>
              <div class="passcode-number">${passcode}</div>
            </div>

            <div class="warning">
              ⏰ <strong>This code expires in 10 minutes</strong><br>
              Use it right away to access your account.
            </div>

            <div class="instructions">
              <h3 style="margin-top: 0; color: #15803d;">How to use your code:</h3>
              
              <div class="step">
                <span class="step-number">1</span>
                <span>Go to the Roo student login page</span>
              </div>
              
              <div class="step">
                <span class="step-number">2</span>
                <span>Enter your email address</span>
              </div>
              
              <div class="step">
                <span class="step-number">3</span>
                <span>Enter the 6-digit code: <strong>${passcode}</strong></span>
              </div>
              
              <div class="step">
                <span class="step-number">4</span>
                <span>Click "Sign In" to access your grades</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="https://roo-app.web.app/student" class="login-url">
                Open Student Login Page
              </a>
            </div>

            ${teacherEmail ? `
              <div class="teacher-info">
                <strong>From:</strong> ${teacher}<br>
                <strong>Email:</strong> ${teacherEmail}
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p><strong>This email was sent from Roo's secure email system.</strong></p>
            <p>If you have questions about your assignments or grades, ${teacherEmail ? `reply to this email to contact ${teacher}` : 'contact your teacher'}.</p>
            <p style="font-size: 12px; margin-top: 20px;">
              If you didn't request this code, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

/**
 * Create Brevo email service instance
 */
export function createBrevoEmailService(apiKey: string): BrevoEmailService {
  return new BrevoEmailService(apiKey);
}