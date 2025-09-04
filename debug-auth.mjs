#!/usr/bin/env node

/**
 * Debug script to test Firebase authentication and profile loading
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';
import fetch from 'node-fetch';

const firebaseConfig = {
  apiKey: 'AIzaSyClZQWC6ksWWwxZjSEautayQqoNTshjp1k',
  authDomain: 'roo-app-3d24e.firebaseapp.com',
  projectId: 'roo-app-3d24e',
  storageBucket: 'roo-app-3d24e.firebasestorage.app',
  messagingSenderId: '253828549203',
  appId: '1:253828549203:web:0049eccccd6c436aaf54a6'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testAuth() {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    console.log('🔧 Connected to auth emulator');
    
    const userCredential = await signInWithEmailAndPassword(auth, 'teacher1@test.com', 'test123');
    console.log('✅ Authentication successful for:', userCredential.user.email);
    console.log('   UID:', userCredential.user.uid);
    
    const token = await userCredential.user.getIdToken();
    console.log('✅ Token generated:', token.substring(0, 50) + '...');
    
    // Test profile API call
    console.log('📡 Testing profile API call...');
    const response = await fetch('http://127.0.0.1:5001/roo-app-3d24e/us-central1/api/users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('📡 Profile API Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📄 Full error:', error);
  }
}

testAuth();