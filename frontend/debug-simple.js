// Simple debug script to capture browser console logs
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    // Show all console output
    console.log(`[${type.toUpperCase()}] ${text}`);
  });

  // Capture network failures
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`❌ HTTP ${response.status()}: ${response.url()}`);
    }
  });

  try {
    // Mock authenticated user that matches classroom data
    const mockUser = {
      uid: 'email-teacher-123',
      email: 'teacher@test.com',
      displayName: 'Test Teacher',
      role: 'teacher',
      schoolEmail: 'test.codepet@gmail.com'
    };

    // Setup authentication mocks before navigation
    await page.addInitScript((user) => {
      console.log('Setting up auth mocks for user:', user);
      
      // Create a mock Firebase user that mimics the real Firebase User object
      const mockFirebaseUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: true,
        isAnonymous: false,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString()
        },
        providerData: [{
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          providerId: 'password'
        }],
        getIdToken: async () => {
          console.log('getIdToken called, returning mock token');
          return 'mock-firebase-jwt-token';
        },
        getIdTokenResult: async () => ({
          token: 'mock-firebase-jwt-token',
          claims: { role: user.role }
        })
      };

      // Mock Firebase Auth
      window.__mockAuth = {
        currentUser: mockFirebaseUser,
        user: user,
        isAuthenticated: true
      };

      const mockAuth = {
        currentUser: mockFirebaseUser,
        onAuthStateChanged: (callback) => {
          console.log('🔥 onAuthStateChanged called, triggering with user:', user.email);
          // Immediately trigger with user to simulate successful auth
          setTimeout(() => {
            console.log('🔥 Calling auth callback with user');
            callback(mockFirebaseUser);
          }, 50);
          return () => {}; // Unsubscribe function
        },
        signOut: async () => {
          window.__mockAuth.currentUser = null;
          window.__mockAuth.isAuthenticated = false;
        }
      };

      // Mock the Firebase modules at the global level
      // This intercepts the Firebase imports in the app
      window.__FIREBASE_MOCK__ = {
        auth: mockAuth,
        getAuth: () => mockAuth,
        onAuthStateChanged: mockAuth.onAuthStateChanged
      };
      
      // Set localStorage items that the app expects
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_token', 'mock-firebase-token');
      
      console.log('🔥 Firebase auth mocks setup complete');
    }, mockUser);

    // Navigate to dashboard with mocked auth
    await page.goto('http://localhost:5173/dashboard/teacher');
    console.log('🎯 Reached dashboard page');
    
    // Wait for any API calls to complete
    await page.waitForTimeout(3000);
    
    // Check final state
    const emptyStateCount = await page.locator('text=No classrooms found').count();
    const classroomCount = await page.locator('text=11 CS P1').count(); // Look for specific classroom name
    
    console.log('\n📊 Final Dashboard State:');
    console.log(`Empty state indicators: ${emptyStateCount}`);
    console.log(`Classroom cards: ${classroomCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();