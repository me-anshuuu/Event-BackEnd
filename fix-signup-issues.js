import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {});
    console.log(chalk.green.bold(`MongoDB Connected: ${conn.connection.host}`));
    return conn;
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
};

const cleanupDuplicateUsers = async () => {
  console.log(chalk.cyan('=== RUNNING COMPREHENSIVE SIGNUP ISSUE CLEANUP ==='));
  
  try {
    // 1. Analyze existing users
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    console.log(chalk.yellow('Analyzing existing users...'));
    const totalUsers = await usersCollection.countDocuments();
    console.log(chalk.yellow(`Total users in database: ${totalUsers}`));
    
    // 2. Check for duplicate emails (case-insensitive)
    const emailAggregation = await usersCollection.aggregate([
      {
        $group: {
          _id: { $toLower: "$email" },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          emails: { $push: "$email" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();
    
    if (emailAggregation.length > 0) {
      console.log(chalk.red(`Found ${emailAggregation.length} duplicated emails (case-insensitive):`));
      for (const dupe of emailAggregation) {
        console.log(chalk.red(`Email "${dupe._id}" appears ${dupe.count} times with variations: ${dupe.emails.join(', ')}`));
        
        // Keep only the first document with this email (oldest one)
        // Sort by _id to get a deterministic order (assuming ObjectIDs which include creation timestamp)
        const sortedIds = dupe.ids.sort();
        const keepId = sortedIds[0];
        const deleteIds = sortedIds.slice(1);
        
        if (deleteIds.length > 0) {
          console.log(chalk.yellow(`Keeping user ${keepId}, removing ${deleteIds.length} duplicates`));
          const deleteResult = await usersCollection.deleteMany({ 
            _id: { $in: deleteIds.map(id => new mongoose.Types.ObjectId(id)) } 
          });
          console.log(chalk.green(`Deleted ${deleteResult.deletedCount} duplicate users`));
        }
      }
    } else {
      console.log(chalk.green('No duplicate emails found.'));
    }
    
    // 3. List and drop all indexes
    console.log(chalk.yellow('Checking indexes...'));
    const indexes = await usersCollection.indexes();
    console.log(chalk.yellow('Current indexes:'));
    
    for (const index of indexes) {
      console.log(chalk.cyan(`- ${index.name}: ${JSON.stringify(index.key)}`));
      
      // Drop all indexes except _id_
      if (index.name !== '_id_') {
        try {
          console.log(chalk.yellow(`Dropping index ${index.name}...`));
          await usersCollection.dropIndex(index.name);
          console.log(chalk.green(`Successfully dropped index ${index.name}`));
        } catch (err) {
          console.log(chalk.red(`Error dropping index ${index.name}: ${err.message}`));
        }
      }
    }
    
    // 4. Create a new proper case-insensitive unique email index
    console.log(chalk.yellow('Creating new case-insensitive email index...'));
    try {
      await usersCollection.createIndex(
        { email: 1 }, 
        { 
          unique: true, 
          background: true,
          collation: { locale: 'en', strength: 2 }  // Makes the index case-insensitive
        }
      );
      console.log(chalk.green('Successfully created case-insensitive email index'));
    } catch (err) {
      console.log(chalk.red(`Error creating email index: ${err.message}`));
    }
    
    // 5. Create userCode index if needed
    console.log(chalk.yellow('Creating userCode index...'));
    try {
      await usersCollection.createIndex(
        { userCode: 1 }, 
        { 
          unique: true, 
          background: true
        }
      );
      console.log(chalk.green('Successfully created userCode index'));
    } catch (err) {
      console.log(chalk.red(`Error creating userCode index: ${err.message}`));
    }
    
    // 6. Verify indexes after recreation
    console.log(chalk.yellow('Verifying indexes after recreation...'));
    const newIndexes = await usersCollection.indexes();
    for (const index of newIndexes) {
      console.log(chalk.cyan(`- ${index.name}: ${JSON.stringify(index.key)}`));
    }
    
    // 7. Attempt a test user insert to verify
    const testEmail = `test-${Date.now()}@example.com`;
    console.log(chalk.yellow(`Attempting to insert a test user with email ${testEmail}...`));
    
    try {
      const result = await usersCollection.insertOne({
        email: testEmail,
        password: 'test-password-hash',
        userCode: new mongoose.Types.ObjectId().toString(),
        role: 'user',
        createdAt: new Date(),
        cartData: {}
      });
      
      console.log(chalk.green(`Test user inserted successfully with ID: ${result.insertedId}`));
      
      // Clean up the test user
      await usersCollection.deleteOne({ _id: result.insertedId });
      console.log(chalk.green('Test user removed successfully'));
    } catch (err) {
      console.log(chalk.red(`Error inserting test user: ${err.message}`));
    }
    
    // 8. Run a repair command on the collection
    console.log(chalk.yellow('Running compact on the users collection...'));
    try {
      await db.command({ compact: 'users' });
      console.log(chalk.green('Compact operation completed successfully'));
    } catch (err) {
      console.log(chalk.red(`Error during compact: ${err.message}`));
    }
    
    console.log(chalk.green.bold('Fix script completed successfully!'));
    console.log(chalk.cyan('If signup issues persist, please check the MongoDB logs for more details.'));
    console.log(chalk.cyan('You may also need to restart your application servers.'));
    
  } catch (error) {
    console.error(chalk.red(`Error during cleanup: ${error.message}`));
    console.error(error);
  }
};

const main = async () => {
  await connectDB();
  await cleanupDuplicateUsers();
  process.exit(0);
};

main(); 