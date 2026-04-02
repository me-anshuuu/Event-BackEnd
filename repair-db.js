import mongoose from "mongoose";
import "dotenv/config";
import { connectDB } from "./config/db.js";

async function repairDatabase() {
  try {
    // Connect to the database
    console.log("Connecting to database...");
    await connectDB();
    console.log("Database connected successfully");

    // 1. First, drop the problematic userId index directly from the users collection
    try {
      console.log("Dropping problematic userId index...");
      await mongoose.connection.db.collection('users').dropIndex('userId_1');
      console.log("Successfully dropped userId_1 index");
    } catch (error) {
      console.log("Note: Could not drop userId index - it might not exist or another error occurred:", error.message);
    }

    // 2. Get all collection names in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Database has ${collections.length} collections`);
    
    // 3. Check the indexes on the users collection
    if (collections.some(c => c.name === 'users')) {
      console.log("Examining indexes on users collection...");
      const indexes = await mongoose.connection.db.collection('users').indexes();
      console.log("Current indexes:", JSON.stringify(indexes, null, 2));
      
      // 4. Drop any other problematic indexes
      for (const index of indexes) {
        if (index.name !== '_id_' && index.key && index.key.userId) {
          try {
            console.log(`Dropping index ${index.name}...`);
            await mongoose.connection.db.collection('users').dropIndex(index.name);
            console.log(`Successfully dropped index ${index.name}`);
          } catch (error) {
            console.log(`Error dropping index ${index.name}:`, error.message);
          }
        }
      }
    }

    // 5. Now we'll ensure all users have a userCode
    // Define a simplified User model just for the repair
    const userSchema = new mongoose.Schema({
      email: String,
      userCode: String,
      password: String
    }, { strict: false }); // Allow extra fields
    
    // Use a different model name to avoid conflicts
    const RepairUser = mongoose.model('RepairUser', userSchema, 'users');
    
    console.log("Searching for users that need repair...");
    const users = await RepairUser.find({});
    console.log(`Found ${users.length} total users`);
    
    let repaired = 0;
    
    // 6. Update each user to ensure they have a userCode and remove userId
    for (const user of users) {
      const updates = {};
      let needsUpdate = false;
      
      // If user doesn't have a userCode, generate one
      if (!user.userCode) {
        updates.userCode = new mongoose.Types.ObjectId().toString();
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        try {
          await RepairUser.updateOne(
            { _id: user._id },
            { 
              $set: updates,
              $unset: { userId: "" } // Remove the userId field regardless
            }
          );
          repaired++;
          console.log(`Updated user ${user._id}`);
        } catch (error) {
          console.error(`Failed to update user ${user._id}:`, error.message);
        }
      }
    }
    
    console.log(`Repaired ${repaired} out of ${users.length} users`);
    console.log("Database repair completed successfully");
    return true;
  } catch (error) {
    console.error("Error during database repair:", error);
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

// Run the repair function and exit
repairDatabase()
  .then(success => {
    console.log(success ? "Repair completed successfully" : "Repair failed");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Unexpected error during repair:", error);
    process.exit(1);
  }); 