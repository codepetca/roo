/**
 * Authentication Helpers for E2E Tests
 * Location: frontend/e2e/utils/auth-helpers.ts
 * 
 * Utilities to handle authentication setup and mocking in E2E tests
 */

import { Page } from '@playwright/test';

export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'teacher' | 'student';
}

/**
 * Default test users
 */
export const TEST_USERS = {
  teacher: {
    uid: 'teacher-e2e-123',
    email: 'e2e.teacher@test.com',
    displayName: 'E2E Test Teacher',
    role: 'teacher' as const
  },
  codepetTeacher: {
    uid: 'codepet-teacher-123',
    email: 'test.codepet@gmail.com',
    displayName: 'CodePet Test Teacher',
    role: 'teacher' as const
  },
  student: {
    uid: 'student-e2e-123', 
    email: 'e2e.student@test.com',
    displayName: 'E2E Test Student',
    role: 'student' as const
  }
};

/**
 * Mock Firebase Auth for E2E testing
 */
export class AuthHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Setup authentication mocks before page navigation
   */
  async setupAuthMocks(user: MockUser = TEST_USERS.teacher) {
    // Mock Firebase Auth initialization and user state
    await this.page.addInitScript((mockUser: MockUser) => {
      // Mock Firebase modules
      window.__mockAuth = {
        currentUser: mockUser,
        user: mockUser,
        isAuthenticated: true
      };

      // Mock Firebase Auth methods that might be called
      const mockAuth = {
        currentUser: mockUser,
        onAuthStateChanged: (callback: (user: any) => void) => {
          setTimeout(() => callback(mockUser), 100);
          return () => {}; // Unsubscribe function
        },
        signOut: async () => {
          window.__mockAuth.currentUser = null;
          window.__mockAuth.isAuthenticated = false;
        }
      };

      // Make it available globally
      (window as any).firebase = {
        auth: () => mockAuth
      };

      // Mock getAuth from Firebase v9 modular SDK
      (window as any).__getAuth = () => mockAuth;
    }, user);
  }

  /**
   * Login as teacher with mock authentication
   * @param customEmail - Optional custom email (defaults to e2e.teacher@test.com)
   */
  async loginAsTeacher(customEmail?: string) {
    const teacher = customEmail === 'test.codepet@gmail.com' 
      ? TEST_USERS.codepetTeacher
      : customEmail 
        ? { ...TEST_USERS.teacher, email: customEmail, displayName: customEmail.split('@')[0] }
        : TEST_USERS.teacher;
    
    await this.setupAuthMocks(teacher);
    
    // Add localStorage items that the app might expect
    await this.page.addInitScript((teacherData) => {
      localStorage.setItem('auth_user', JSON.stringify(teacherData));
      localStorage.setItem('auth_token', 'mock-firebase-token');
      // Add Google access token for import functionality
      sessionStorage.setItem('google_access_token', 'mock-google-access-token');
    }, teacher);
  }

  /**
   * Login as student with mock authentication
   */
  async loginAsStudent() {
    await this.setupAuthMocks(TEST_USERS.student);
    
    await this.page.addInitScript(() => {
      localStorage.setItem('auth_user', JSON.stringify({
        uid: 'student-e2e-123',
        email: 'e2e.student@test.com',
        displayName: 'E2E Test Student',
        role: 'student'
      }));
      localStorage.setItem('auth_token', 'mock-firebase-token');
    });
  }

  /**
   * Logout (clear authentication)
   */
  async logout() {
    await this.page.addInitScript(() => {
      window.__mockAuth = {
        currentUser: null,
        user: null,
        isAuthenticated: false
      };
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
    });
  }

  /**
   * Check if user is authenticated (in test context)
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return window.__mockAuth?.isAuthenticated || false;
    });
  }

  /**
   * Get current user (in test context)
   */
  async getCurrentUser(): Promise<MockUser | null> {
    return await this.page.evaluate(() => {
      return window.__mockAuth?.currentUser || null;
    });
  }

  /**
   * Navigate to login page and perform login flow
   */
  async navigateAndLogin(role: 'teacher' | 'student' = 'teacher') {
    if (role === 'teacher') {
      await this.loginAsTeacher();
    } else {
      await this.loginAsStudent();
    }

    // Navigate to the app - authentication should be automatically handled
    await this.page.goto('/');
    
    // Wait for authentication to be processed
    await this.page.waitForFunction(() => {
      return window.__mockAuth?.isAuthenticated === true;
    });
  }

  /**
   * Bypass authentication and go directly to authenticated pages
   */
  async bypassAuthAndGoto(url: string, role: 'teacher' | 'student' = 'teacher') {
    await this.setupAuthMocks(role === 'teacher' ? TEST_USERS.teacher : TEST_USERS.student);
    await this.page.goto(url);
  }

  /**
   * Mock authentication loading state
   */
  async mockAuthLoading(delayMs: number = 2000) {
    await this.page.addInitScript((delay: number) => {
      window.__mockAuth = {
        currentUser: null,
        user: null,
        isAuthenticated: false,
        isLoading: true
      };

      // Simulate loading delay
      setTimeout(() => {
        window.__mockAuth = {
          currentUser: {
            uid: 'teacher-e2e-123',
            email: 'e2e.teacher@test.com',
            displayName: 'E2E Test Teacher',
            role: 'teacher'
          },
          user: {
            uid: 'teacher-e2e-123',
            email: 'e2e.teacher@test.com',
            displayName: 'E2E Test Teacher',
            role: 'teacher'
          },
          isAuthenticated: true,
          isLoading: false
        };
      }, delay);
    }, delayMs);
  }

  /**
   * Mock authentication error
   */
  async mockAuthError(errorMessage: string = 'Authentication failed') {
    await this.page.addInitScript((error: string) => {
      window.__mockAuth = {
        currentUser: null,
        user: null,
        isAuthenticated: false,
        error
      };
    }, errorMessage);
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuth(timeout: number = 5000) {
    await this.page.waitForFunction(() => {
      return window.__mockAuth && 
             (window.__mockAuth.isAuthenticated === true || 
              window.__mockAuth.error);
    }, { timeout });
  }

  /**
   * Assert user is authenticated as teacher
   */
  async assertAuthenticatedAsTeacher() {
    const user = await this.getCurrentUser();
    const isAuth = await this.isAuthenticated();
    
    if (!isAuth || !user || user.role !== 'teacher') {
      throw new Error(`Expected to be authenticated as teacher, but got: ${JSON.stringify(user)}`);
    }
  }

  /**
   * Assert user is authenticated as student
   */
  async assertAuthenticatedAsStudent() {
    const user = await this.getCurrentUser();
    const isAuth = await this.isAuthenticated();
    
    if (!isAuth || !user || user.role !== 'student') {
      throw new Error(`Expected to be authenticated as student, but got: ${JSON.stringify(user)}`);
    }
  }

  /**
   * Assert user is not authenticated
   */
  async assertNotAuthenticated() {
    const isAuth = await this.isAuthenticated();
    
    if (isAuth) {
      throw new Error('Expected user to not be authenticated');
    }
  }
}

/**
 * Quick helper function to create AuthHelper
 */
export function createAuthHelper(page: Page): AuthHelper {
  return new AuthHelper(page);
}

/**
 * Type declarations for mock auth window object
 */
declare global {
  interface Window {
    __mockAuth?: {
      currentUser: MockUser | null;
      user: MockUser | null;
      isAuthenticated: boolean;
      isLoading?: boolean;
      error?: string;
    };
  }
}