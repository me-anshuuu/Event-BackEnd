import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB with hardcoded URI
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://Sakshi:Homease@cluster0.jum4d.mongodb.net/Homease');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const fixPhoneIndex = async () => {
  console.log('=== FIXING PHONE INDEX ISSUE ===');
  
  try {
    // Get database and users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // List all current indexes
    console.log('Current indexes on users collection:');
    const indexes = await usersCollection.indexes();
    for (const index of indexes) {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    }
    
    // Look specifically for phone index
    const phoneIndex = indexes.find(index => 
      index.key && index.key.phone === 1
    );
    
    if (phoneIndex) {
      console.log(`Found phone index: ${phoneIndex.name}`);
      
      // Drop the phone index
      try {
        console.log(`Dropping phone index ${phoneIndex.name}...`);
        await usersCollection.dropIndex(phoneIndex.name);
        console.log(`Successfully dropped phone index ${phoneIndex.name}`);
      } catch (err) {
        console.log(`Error dropping phone index: ${err.message}`);
      }
      
      // Create new non-unique phone index if needed
      console.log('Creating new non-unique phone index...');
      try {
        await usersCollection.createIndex(
          { phone: 1 }, 
          { 
            unique: false, // Make it non-unique
            background: true,
            sparse: true // Only index documents that have the phone field
          }
        );
        console.log('Successfully created non-unique phone index');
      } catch (err) {
        console.log(`Error creating phone index: ${err.message}`);
      }
    } else {
      console.log('No phone index found - this is unexpected based on the error');
      
      // Try to drop it anyway using the name
      try {
        await usersCollection.dropIndex('phone_1');
        console.log('Successfully dropped phone_1 index by name');
      } catch (err) {
        console.log(`Error dropping phone_1 index by name: ${err.message}`);
      }
    }
    
    // Display users with empty phone fields
    console.log('Checking for users with empty phone fields...');
    const usersWithEmptyPhone = await usersCollection.find({ phone: "" }).toArray();
    console.log(`Found ${usersWithEmptyPhone.length} users with empty phone field`);
    
    if (usersWithEmptyPhone.length > 0) {
      // Update users with empty phone field to null instead
      console.log('Updating users with empty phone to have null phone...');
      const updateResult = await usersCollection.updateMany(
        { phone: "" },
        { $set: { phone: null } }
      );
      console.log(`Updated ${updateResult.modifiedCount} users with empty phone to null`);
    }
    
    // Verify the fix by inserting a test user
    const testEmail = `test-phone-fix-${Date.now()}@example.com`;
    console.log(`Attempting to insert a test user with email ${testEmail} and empty phone...`);
    
    try {
      const result = await usersCollection.insertOne({
        email: testEmail,
        password: 'test-password-hash',
        userCode: new mongoose.Types.ObjectId().toString(),
        phone: "", // Empty phone to verify our fix
        role: 'user',
        createdAt: new Date(),
        cartData: {}
      });
      
      console.log(`Test user inserted successfully with ID: ${result.insertedId}`);
      
      // Clean up the test user
      await usersCollection.deleteOne({ _id: result.insertedId });
      console.log('Test user removed successfully');
    } catch (err) {
      console.log(`Error inserting test user: ${err.message}`);
    }
    
    // List indexes after fixes
    console.log('Verifying indexes after fix:');
    const newIndexes = await usersCollection.indexes();
    for (const index of newIndexes) {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    }
    
    console.log('Fix script completed successfully!');
    console.log('You should now be able to register users with empty phone fields.');
    
  } catch (error) {
    console.error(`Error during fix: ${error.message}`);
    console.error(error);
  }
};

const main = async () => {
  await connectDB();
  await fixPhoneIndex();
  process.exit(0);
};

main(); 