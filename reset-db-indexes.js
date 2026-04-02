import mongoose from "mongoose";
import "dotenv/config";
import { connectDB } from "./config/db.js";
import userModel from "./models/userModel.js";

async function resetIndexes() {
  try {
    // Connect to the database
    console.log("Connecting to database...");
    await connectDB();
    console.log("Database connected successfully");

    // Get the Users collection
    const usersCollection = mongoose.connection.db.collection('users');
    console.log("Got users collection");

    // 1. Get current indexes
    const indexes = await usersCollection.indexes();
    console.log("Current indexes:", JSON.stringify(indexes, null, 2));

    // 2. Drop all indexes except _id_
    for (const index of indexes) {
      if (index.name !== '_id_') {
        try {
          console.log(`Dropping index ${index.name}...`);
          await usersCollection.dropIndex(index.name);
          console.log(`Successfully dropped index ${index.name}`);
        } catch (error) {
          console.log(`Error dropping index ${index.name}:`, error.message);
        }
      }
    }

    // 3. Create new indexes
    console.log("Creating new indexes...");
    
    // Email index
    await usersCollection.createIndex(
      { email: 1 }, 
      { unique: true, background: true }
    );
    console.log("Created email index");
    
    // UserCode index
    await usersCollection.createIndex(
      { userCode: 1 }, 
      { unique: true, background: true }
    );
    console.log("Created userCode index");

    // 4. Verify indexes
    const newIndexes = await usersCollection.indexes();
    console.log("New indexes:", JSON.stringify(newIndexes, null, 2));

    console.log("Database index reset completed successfully");
    return true;
  } catch (error) {
    console.error("Error during database index reset:", error);
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

// Run the index reset function
resetIndexes()
  .then(success => {
    console.log(success ? "Index reset completed successfully" : "Index reset failed");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Unexpected error during index reset:", error);
    process.exit(1);
  }); 