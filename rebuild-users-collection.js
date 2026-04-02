import mongoose from "mongoose";
import "dotenv/config";
import { connectDB } from "./config/db.js";
import bcrypt from "bcrypt";

async function rebuildUsersCollection() {
  try {
    // Connect to the database
    console.log("Connecting to database...");
    await connectDB();
    console.log("Database connected successfully");

    const db = mongoose.connection.db;
    
    // Get the Users collection
    const usersCollection = db.collection('users');
    console.log("Got users collection");

    // 1. Backup all existing users to a temporary collection
    console.log("Creating backup of users...");
    
    // Check if backup collection exists and drop it
    const collections = await db.listCollections({name: 'users_backup'}).toArray();
    if (collections.length > 0) {
      await db.dropCollection('users_backup');
      console.log("Dropped existing users_backup collection");
    }
    
    // Create backup collection
    await db.createCollection('users_backup');
    const backupCollection = db.collection('users_backup');
    
    // Copy all users to backup
    const allUsers = await usersCollection.find({}).toArray();
    console.log(`Found ${allUsers.length} total users to backup`);
    
    if (allUsers.length > 0) {
      await backupCollection.insertMany(allUsers);
      console.log(`Backed up ${allUsers.length} users to users_backup collection`);
    }
    
    // 2. Drop all indexes from users collection
    console.log("Dropping all indexes from users collection...");
    await usersCollection.dropIndexes();
    console.log("Dropped all indexes from users collection");
    
    // 3. Create a fresh set of users with no duplicates
    console.log("Creating fresh set of users with no duplicates...");
    
    // Drop the users collection and create a new one
    await db.dropCollection('users');
    console.log("Dropped users collection");
    await db.createCollection('users');
    console.log("Created fresh users collection");
    
    // Get the new users collection
    const newUsersCollection = db.collection('users');
    
    // 4. Create proper indexes BEFORE inserting any data
    console.log("Creating proper indexes...");
    await newUsersCollection.createIndex(
      { email: 1 }, 
      { 
        unique: true, 
        background: true,
        collation: { locale: 'en', strength: 2 } // Case-insensitive
      }
    );
    console.log("Created case-insensitive email index");
    
    await newUsersCollection.createIndex(
      { userCode: 1 }, 
      { unique: true, background: true }
    );
    console.log("Created userCode index");
    
    // 5. Process backup users and insert unique ones into the new collection
    const processedEmails = new Set();
    let insertedCount = 0;
    
    for (const user of allUsers) {
      // Skip users without email
      if (!user.email) continue;
      
      // Normalize email to lowercase
      const normalizedEmail = user.email.toLowerCase();
      
      // Skip duplicate emails
      if (processedEmails.has(normalizedEmail)) continue;
      processedEmails.add(normalizedEmail);
      
      // Ensure user has all required fields
      const cleanUser = {
        ...user,
        email: normalizedEmail,
        userCode: user.userCode || new mongoose.Types.ObjectId().toString(),
        createdAt: user.createdAt || new Date()
      };
      
      // Insert clean user
      try {
        await newUsersCollection.insertOne(cleanUser);
        insertedCount++;
        console.log(`Inserted user with email: ${normalizedEmail}`);
      } catch (error) {
        console.error(`Error inserting user with email ${normalizedEmail}:`, error.message);
      }
    }
    
    console.log(`Successfully inserted ${insertedCount} unique users into the new collection`);
    
    // Create a test user for verification
    const testEmail = "test@example.com";
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
      await newUsersCollection.insertOne(testUser);
      console.log(`Created test user with email: ${testEmail} and password: password123`);
    } catch (error) {
      console.error(`Failed to create test user:`, error.message);
    }
    
    console.log("Users collection rebuild completed successfully");
    return true;
  } catch (error) {
    console.error("Error during users collection rebuild:", error);
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

// Run the rebuild function
rebuildUsersCollection()
  .then(success => {
    console.log(success ? "Users collection rebuild completed successfully" : "Users collection rebuild failed");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Unexpected error during users collection rebuild:", error);
    process.exit(1);
  }); 