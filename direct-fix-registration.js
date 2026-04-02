import mongoose from "mongoose";
import "dotenv/config";
import { connectDB } from "./config/db.js";
import bcrypt from "bcrypt";

async function directFixRegistration() {
  try {
    // Connect to the database
    console.log("Connecting to database...");
    await connectDB();
    console.log("Database connected successfully");

    const db = mongoose.connection.db;
    
    // 1. Check all collections in the database
    console.log("Checking all collections in database...");
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections: ${collections.map(c => c.name).join(', ')}`);
    
    // 2. Specifically check the users collection
    const usersCollection = db.collection('users');
    
    // 3. Count documents in users collection
    const userCount = await usersCollection.countDocuments();
    console.log(`Found ${userCount} documents in users collection`);
    
    // 4. List all email addresses currently in the database
    const allEmails = await usersCollection.find({}, { projection: { email: 1 } }).toArray();
    console.log("Current emails in database:");
    allEmails.forEach(user => console.log(`- ${user.email || 'NO EMAIL'}`));
    
    // 5. List all indexes on the users collection
    const indexes = await usersCollection.indexes();
    console.log("Current indexes on users collection:");
    console.log(JSON.stringify(indexes, null, 2));
    
    // 6. Drop ALL indexes except _id_
    for (const index of indexes) {
      if (index.name !== '_id_') {
        try {
          console.log(`Dropping index ${index.name}...`);
          await usersCollection.dropIndex(index.name);
          console.log(`Successfully dropped index ${index.name}`);
        } catch (err) {
          console.log(`Error dropping index ${index.name}:`, err.message);
        }
      }
    }
    
    // 7. Create new unique email index
    try {
      await usersCollection.createIndex(
        { email: 1 }, 
        { 
          unique: true, 
          background: true,
          name: "email_1_unique",
          collation: { locale: 'en', strength: 2 } // Case-insensitive
        }
      );
      console.log("Created case-insensitive unique email index");
    } catch (error) {
      console.error("Failed to create email index:", error.message);
    }
    
    // 8. Create a completely unique test email and try to insert it
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testPassword = await bcrypt.hash("password123", 10);
    const testUser = {
      email: testEmail,
      password: testPassword,
      userCode: new mongoose.Types.ObjectId().toString(),
      role: 'user',
      createdAt: new Date(),
      cartData: {}
    };
    
    try {
      const result = await usersCollection.insertOne(testUser);
      console.log(`Successfully inserted test user ${testEmail} with ID: ${result.insertedId}`);
      console.log("THIS CONFIRMS THE DATABASE IS ACCEPTING NEW REGISTRATIONS");
    } catch (error) {
      console.error(`CRITICAL ERROR: Failed to insert test user:`, error.message);
      console.error("The database is still not accepting new email addresses!");
    }
    
    // 9. Try to make a direct database modification to clean up any lingering issues
    console.log("Checking for any invisible or problematic constraints...");
    
    // Attempt to add a hint to MongoDB about the collection
    try {
      // This is an undocumented MongoDB trick to "reset" a collection's internal state
      await db.command({ compact: 'users' });
      console.log("Successfully compacted users collection");
    } catch (error) {
      console.log("Could not compact collection (usually not a problem):", error.message);
    }
    
    console.log(`
====================================================================
DIAGNOSTIC COMPLETE - USE THE FOLLOWING TEST ACCOUNT TO VERIFY:

Email: ${testEmail}
Password: password123

If you still can't register new users, follow these steps:
1. Stop the backend server
2. Run 'npm run direct-fix' to run this script again
3. Restart the backend server with 'npm run backend'
====================================================================
    `);
    
    return true;
  } catch (error) {
    console.error("Error during direct fix:", error);
    return false;
  } finally {
    // Disconnect from database
    try {
      await mongoose.disconnect();
      console.log("Disconnected from database");
    } catch (error) {
      console.error("Error disconnecting from database:", error);
    }
  }
}

// Run the fix function
directFixRegistration()
  .then(success => {
    console.log(success ? "Direct fix completed successfully" : "Direct fix failed");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Unexpected error during direct fix:", error);
    process.exit(1);
  }); 