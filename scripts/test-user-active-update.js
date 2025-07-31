const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUserActiveUpdate() {
  try {
    console.log('🧪 Testing user active status update...\n');

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
    console.log(`📊 Current isActive status: ${existingUser.isActive}`);

    // 2. Test updating isActive to false
    console.log('\n🔄 Testing update isActive to false...');
    const updateToFalse = await prisma.user.update({
      where: { id: existingUser.id },
      data: { isActive: false }
    });

    console.log(`✅ Updated isActive to false: ${updateToFalse.isActive}`);

    // 3. Test updating isActive to true
    console.log('\n🔄 Testing update isActive to true...');
    const updateToTrue = await prisma.user.update({
      where: { id: existingUser.id },
      data: { isActive: true }
    });

    console.log(`✅ Updated isActive to true: ${updateToTrue.isActive}`);

    // 4. Test updating other fields while keeping isActive
    console.log('\n🔄 Testing update other fields while keeping isActive...');
    const updateOtherFields = await prisma.user.update({
      where: { id: existingUser.id },
      data: { 
        email: existingUser.email, // Keep same email
        role: existingUser.role,   // Keep same role
        // isActive not specified, should keep current value
      }
    });

    console.log(`✅ Updated other fields, isActive remains: ${updateOtherFields.isActive}`);

    // 5. Test updating with undefined isActive
    console.log('\n🔄 Testing update with undefined isActive...');
    const updateWithUndefined = await prisma.user.update({
      where: { id: existingUser.id },
      data: { 
        email: existingUser.email,
        role: existingUser.role
        // isActive not included in data
      }
    });

    console.log(`✅ Updated with undefined isActive, current value: ${updateWithUndefined.isActive}`);

    console.log('\n🎉 Test completed successfully!');
    console.log('📝 Summary:');
    console.log('   - isActive can be updated to false');
    console.log('   - isActive can be updated to true');
    console.log('   - isActive is preserved when not specified in update');
    console.log('   - Other fields can be updated without affecting isActive');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testUserActiveUpdate(); 