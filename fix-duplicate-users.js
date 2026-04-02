import mongoose from "mongoose";
import "dotenv/config";
import { connectDB } from "./config/db.js";

async function fixDuplicateUsers() {
  try {
    // Connect to the database
    console.log("Connecting to database...");
    await connectDB();
    console.log("Database connected successfully");

    // Get the Users collection
    const usersCollection = mongoose.connection.db.collection('users');
    console.log("Got users collection");

    // Get all users
    const allUsers = await usersCollection.find({}).toArray();
    console.log(`Found ${allUsers.length} total users`);

    // Check for duplicate emails (case-insensitive)
    const emailMap = new Map();
    const duplicates = [];

    // First pass: identify duplicates
    for (const user of allUsers) {
      if (!user.email) continue;
      
      const lowerEmail = user.email.toLowerCase();
      
      if (emailMap.has(lowerEmail)) {
        // Found a duplicate
        duplicates.push({
          email: user.email,
          _id: user._id,
          createdAt: user.createdAt
        });
      } else {
        emailMap.set(lowerEmail, {
          _id: user._id,
          email: user.email,
          createdAt: user.createdAt
        });
      }
    }

    console.log(`Found ${duplicates.length} duplicate users`);

    // Delete duplicate users (keeping the older one)
    if (duplicates.length > 0) {
      for (const dup of duplicates) {
        const originalUser = emailMap.get(dup.email.toLowerCase());
        
        // Keep the older user account
        const toDelete = dup.createdAt > originalUser.createdAt ? dup._id : originalUser._id;
        const toKeep = dup.createdAt > originalUser.createdAt ? originalUser._id : dup._id;
        
        console.log(`Deleting duplicate user ${toDelete} and keeping ${toKeep} for email ${dup.email}`);
        
        await usersCollection.deleteOne({ _id: toDelete });
        console.log(`Deleted user ${toDelete}`);
      }
    }

    // Create a unique index on email (case-insensitive)
    console.log("Creating unique case-insensitive index on email field...");
    await usersCollection.createIndex(
      { email: 1 }, 
      { 
        unique: true, 
        background: true,
        collation: { locale: 'en', strength: 2 } // Case-insensitive
      }
    );
    console.log("Created case-insensitive unique email index");

    console.log("Duplicate user fix completed successfully");
    return true;
  } catch (error) {
    console.error("Error during duplicate user fix:", error);
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
fixDuplicateUsers()
  .then(success => {
    console.log(success ? "Duplicate user fix completed successfully" : "Duplicate user fix failed");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Unexpected error during duplicate user fix:", error);
    process.exit(1);
  }); 