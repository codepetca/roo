const { httpsCallable } = require('firebase/functions');
const { initializeApp } = require('firebase/app');
const { getFunctions, connectFunctionsEmulator } = require('firebase/functions');
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } = require('firebase/auth');

// Firebase config for connecting to emulator
const firebaseConfig = {
  apiKey: "AIzaSyClZQWC6ksWWwxZjSEautayQqoNTshjp1k",
  authDomain: "roo-app-3d24e.firebaseapp.com",
  projectId: "roo-app-3d24e",
  storageBucket: "roo-app-3d24e.firebasestorage.app",
  messagingSenderId: "253828549203",
  appId: "1:253828549203:web:0049eccccd6c436aaf54a6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const auth = getAuth(app);

// Connect to emulators
connectFunctionsEmulator(functions, "127.0.0.1", 5001);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

async function testProfileCreation() {
  try {
    console.log('🧪 Testing profile creation in emulator...');
    
    // Step 1: Create a Firebase Auth user with unique email
    const timestamp = Date.now();
    const testEmail = `teacher-${timestamp}@school.edu`;
    console.log('👤 Creating Firebase Auth user with email:', testEmail);
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      testEmail, 
      'testpassword123'
    );
    
    console.log('✅ Auth user created:', userCredential.user.uid);
    
    // Step 2: Create profile for the existing user
    console.log('📝 Creating user profile...');
    const createProfile = httpsCallable(functions, 'createProfileForExistingUser');
    
    const result = await createProfile({
      uid: userCredential.user.uid,
      role: 'teacher',
      schoolEmail: testEmail,
      displayName: 'Test Teacher'
    });
    
    console.log('✅ Profile creation result:', result.data);
    
  } catch (error) {
    console.error('❌ Error testing profile creation:', error);
    console.error('Error details:', error.message);
    if (error.code) console.error('Error code:', error.code);
  }
}

testProfileCreation();