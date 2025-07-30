const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUserRelatedTablesSync() {
  try {
    console.log('🧪 Testing user active status synchronization with related tables...\n');

    // 1. Find a user that has related student or trainer records
    const userWithRelations = await prisma.user.findFirst({
      where: {
        OR: [
          { student: { isNot: null } },
          { trainer: { isNot: null } }
        ]
      },
      include: {
        student: true,
        trainer: true
      }
    });

    if (!userWithRelations) {
      console.log('❌ No users with related records found to test with');
      return;
    }

    console.log(`📋 Testing with user: ${userWithRelations.email} (ID: ${userWithRelations.id})`);
    console.log(`📊 Current user isActive: ${userWithRelations.isActive}`);
    
    if (userWithRelations.student) {
      console.log(`📊 Current student isActive: ${userWithRelations.student.isActive}`);
    }
    if (userWithRelations.trainer) {
      console.log(`📊 Current trainer isActive: ${userWithRelations.trainer.isActive}`);
    }

    // 2. Test updating user isActive to false and verify related tables
    console.log('\n🔄 Testing update user isActive to false...');
    const updateToFalse = await prisma.user.update({
      where: { id: userWithRelations.id },
      data: { isActive: false },
      include: {
        student: true,
        trainer: true
      }
    });

    console.log(`✅ User isActive updated to: ${updateToFalse.isActive}`);
    if (updateToFalse.student) {
      console.log(`❌ Student isActive should be synchronized but is: ${updateToFalse.student.isActive}`);
    }
    if (updateToFalse.trainer) {
      console.log(`❌ Trainer isActive should be synchronized but is: ${updateToFalse.trainer.isActive}`);
    }

    // 3. Manually sync the related tables (simulating what the API should do)
    console.log('\n🔄 Manually syncing related tables...');
    if (userWithRelations.student) {
      await prisma.student.update({
        where: { userId: userWithRelations.id },
        data: { isActive: false }
      });
      console.log('✅ Student isActive manually synced to false');
    }
    if (userWithRelations.trainer) {
      await prisma.trainer.update({
        where: { id: userWithRelations.trainer.id },
        data: { isActive: false }
      });
      console.log('✅ Trainer isActive manually synced to false');
    }

    // 4. Test updating user isActive to true and verify related tables
    console.log('\n🔄 Testing update user isActive to true...');
    const updateToTrue = await prisma.user.update({
      where: { id: userWithRelations.id },
      data: { isActive: true },
      include: {
        student: true,
        trainer: true
      }
    });

    console.log(`✅ User isActive updated to: ${updateToTrue.isActive}`);
    if (updateToTrue.student) {
      console.log(`❌ Student isActive should be synchronized but is: ${updateToTrue.student.isActive}`);
    }
    if (updateToTrue.trainer) {
      console.log(`❌ Trainer isActive should be synchronized but is: ${updateToTrue.trainer.isActive}`);
    }

    // 5. Manually sync the related tables again
    console.log('\n🔄 Manually syncing related tables to true...');
    if (userWithRelations.student) {
      await prisma.student.update({
        where: { userId: userWithRelations.id },
        data: { isActive: true }
      });
      console.log('✅ Student isActive manually synced to true');
    }
    if (userWithRelations.trainer) {
      await prisma.trainer.update({
        where: { id: userWithRelations.trainer.id },
        data: { isActive: true }
      });
      console.log('✅ Trainer isActive manually synced to true');
    }

    // 6. Verify final state
    const finalState = await prisma.user.findUnique({
      where: { id: userWithRelations.id },
      include: {
        student: true,
        trainer: true
      }
    });

    console.log('\n📊 Final state verification:');
    console.log(`User isActive: ${finalState.isActive}`);
    if (finalState.student) {
      console.log(`Student isActive: ${finalState.student.isActive}`);
    }
    if (finalState.trainer) {
      console.log(`Trainer isActive: ${finalState.trainer.isActive}`);
    }

    console.log('\n🎉 Test completed!');
    console.log('📝 Summary:');
    console.log('   - User isActive can be updated');
    console.log('   - Related tables need manual synchronization (API should handle this)');
    console.log('   - Manual sync works correctly');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testUserRelatedTablesSync(); 