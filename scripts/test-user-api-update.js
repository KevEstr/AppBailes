const fetch = require('node-fetch');

async function testUserAPIUpdate() {
  try {
    console.log('🧪 Testing user API update endpoint...\n');

    // You'll need to replace these with actual values from your database
    const userId = 1; // Replace with actual user ID
    const baseUrl = 'http://localhost:3000'; // Replace with your actual URL

    console.log(`📋 Testing with user ID: ${userId}`);

    // 1. First, get the current user data
    console.log('\n🔍 Getting current user data...');
    const getResponse = await fetch(`${baseUrl}/api/users/${userId}`);
    const userData = await getResponse.json();

    if (!userData.success) {
      console.log('❌ Could not get user data:', userData.error);
      return;
    }

    console.log(`📊 Current user data:`, {
      id: userData.user.id,
      email: userData.user.email,
      isActive: userData.user.isActive
    });

    // 2. Test updating isActive to false
    console.log('\n🔄 Testing update isActive to false...');
    const updateToFalseResponse = await fetch(`${baseUrl}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.user.email,
        role: userData.user.role,
        isActive: false
      })
    });

    const updateToFalseData = await updateToFalseResponse.json();
    console.log('📝 Update to false response:', updateToFalseData);

    if (updateToFalseData.success) {
      console.log(`✅ Updated isActive to false: ${updateToFalseData.user.isActive}`);
    } else {
      console.log('❌ Failed to update to false:', updateToFalseData.error);
    }

    // 3. Test updating isActive to true
    console.log('\n🔄 Testing update isActive to true...');
    const updateToTrueResponse = await fetch(`${baseUrl}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.user.email,
        role: userData.user.role,
        isActive: true
      })
    });

    const updateToTrueData = await updateToTrueResponse.json();
    console.log('📝 Update to true response:', updateToTrueData);

    if (updateToTrueData.success) {
      console.log(`✅ Updated isActive to true: ${updateToTrueData.user.isActive}`);
    } else {
      console.log('❌ Failed to update to true:', updateToTrueData.error);
    }

    // 4. Test updating without isActive (should preserve current value)
    console.log('\n🔄 Testing update without isActive...');
    const updateWithoutActiveResponse = await fetch(`${baseUrl}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.user.email,
        role: userData.user.role
        // isActive not included
      })
    });

    const updateWithoutActiveData = await updateWithoutActiveResponse.json();
    console.log('📝 Update without isActive response:', updateWithoutActiveData);

    if (updateWithoutActiveData.success) {
      console.log(`✅ Updated without isActive, current value: ${updateWithoutActiveData.user.isActive}`);
    } else {
      console.log('❌ Failed to update without isActive:', updateWithoutActiveData.error);
    }

    console.log('\n🎉 API test completed!');

  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Run the test
testUserAPIUpdate(); 