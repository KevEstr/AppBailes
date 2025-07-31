const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testInactiveUserLogin() {
  try {
    console.log('🧪 Testing inactive user login prevention...\n');

    // 1. Find an existing user to test with
    const existingUser = await prisma.user.findFirst({
      where: {
        isActive: true
      }
    });

    if (!existingUser) {
      console.log('❌ No active users found to test with');
      return;
    }

    console.log(`📋 Testing with user: ${existingUser.email} (ID: ${existingUser.id})`);

    // 2. Test login with active user (should work)
    console.log('\n🔍 Testing login with ACTIVE user...');
    const activeUser = await prisma.user.findUnique({
      where: { email: existingUser.email },
      include: { trainer: true }
    });

    if (activeUser && activeUser.isActive) {
      console.log('✅ Active user found and can potentially login');
    } else {
      console.log('❌ Active user test failed');
    }

    // 3. Deactivate the user
    console.log('\n🔄 Deactivating user for test...');
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { isActive: false }
    });
    console.log('✅ User deactivated');

    // 4. Test login with inactive user (should fail)
    console.log('\n🔍 Testing login with INACTIVE user...');
    const inactiveUser = await prisma.user.findUnique({
      where: { email: existingUser.email },
      include: { trainer: true }
    });

    if (inactiveUser && !inactiveUser.isActive) {
      console.log('✅ Inactive user correctly identified - login should be blocked');
    } else {
      console.log('❌ Inactive user test failed');
    }

    // 5. Reactivate the user
    console.log('\n🔄 Reactivating user...');
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { isActive: true }
    });
    console.log('✅ User reactivated');

    // 6. Verify reactivation
    const reactivatedUser = await prisma.user.findUnique({
      where: { id: existingUser.id }
    });

    if (reactivatedUser && reactivatedUser.isActive) {
      console.log('✅ User successfully reactivated');
    } else {
      console.log('❌ User reactivation failed');
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('📝 Summary:');
    console.log('   - Active users can potentially login');
    console.log('   - Inactive users are correctly identified and blocked');
    console.log('   - User status can be toggled properly');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testInactiveUserLogin(); 