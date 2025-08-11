// Quick debug script to test auth timing
console.log('🧪 Auth timing debug script loaded');

// Open browser console at http://localhost:5173/dashboard/teacher
// Then paste this entire script to test auth flow

(async () => {
  console.log('🧪 Starting auth timing debug...');
  
  // Wait for Firebase to be available
  console.log('⏱️ Waiting 3 seconds for Firebase to load...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check auth state
  let currentUser = null;
  if (window.firebaseAuth?.currentUser) {
    currentUser = window.firebaseAuth.currentUser;
    console.log('✅ Found authenticated user:', currentUser.email);
  } else if (window.firebase?.auth()?.currentUser) {
    currentUser = window.firebase.auth().currentUser;
    console.log('✅ Found authenticated user via firebase.auth():', currentUser.email);
  } else {
    console.log('❌ No authenticated user found');
    console.log('Available window keys:', Object.keys(window).filter(k => k.includes('fire')));
    return;
  }
  
  // Get auth token
  console.log('🔑 Getting auth token...');
  const token = await currentUser.getIdToken();
  console.log('✅ Got token:', token.substring(0, 20) + '...');
  
  // Test API call directly
  console.log('🌐 Testing direct API call...');
  try {
    const response = await fetch('http://localhost:5001/roo-app-3d24e/us-central1/api/teacher/dashboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 API Response status:', response.status);
    const data = await response.json();
    console.log('📊 API Response data:', data);
    
    if (data.success && data.data?.classrooms) {
      console.log('✅ SUCCESS: Found', data.data.classrooms.length, 'classrooms');
    } else {
      console.log('❌ ISSUE: No classroom data in response');
    }
  } catch (error) {
    console.log('❌ API call failed:', error);
  }
  
  console.log('🧪 Debug script completed');
})();