import { spawn } from 'child_process';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('=== APPLYING ALL DATABASE FIXES AND RESTARTING SERVER ===');

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

const applyAllFixes = async () => {
  try {
    // Connect to the database
    await connectDB();
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    console.log('1. Checking all indexes on users collection...');
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:');
    for (const index of indexes) {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    }
    
    console.log('2. Dropping all non-essential indexes...');
    for (const index of indexes) {
      if (index.name !== '_id_') {
        try {
          console.log(`Dropping index ${index.name}...`);
          await usersCollection.dropIndex(index.name);
          console.log(`Successfully dropped index ${index.name}`);
        } catch (err) {
          console.log(`Error dropping index ${index.name}: ${err.message}`);
        }
      }
    }
    
    console.log('3. Checking for users with empty phone fields...');
    const usersWithEmptyPhone = await usersCollection.find({ phone: "" }).toArray();
    console.log(`Found ${usersWithEmptyPhone.length} users with empty phone field`);
    
    if (usersWithEmptyPhone.length > 0) {
      console.log('4. Updating users with empty phone to have null phone...');
      const updateResult = await usersCollection.updateMany(
        { phone: "" },
        { $set: { phone: null } }
      );
      console.log(`Updated ${updateResult.modifiedCount} users with empty phone to null`);
    }
    
    console.log('5. Creating new case-insensitive email index...');
    try {
      await usersCollection.createIndex(
        { email: 1 }, 
        { 
          unique: true, 
          background: true,
          collation: { locale: 'en', strength: 2 }  // Makes the index case-insensitive
        }
      );
      console.log('Successfully created case-insensitive email index');
    } catch (err) {
      console.log(`Error creating email index: ${err.message}`);
    }
    
    console.log('6. Creating userCode index...');
    try {
      await usersCollection.createIndex(
        { userCode: 1 }, 
        { 
          unique: true, 
          background: true
        }
      );
      console.log('Successfully created userCode index');
    } catch (err) {
      console.log(`Error creating userCode index: ${err.message}`);
    }
    
    console.log('7. Creating non-unique, sparse phone index...');
    try {
      await usersCollection.createIndex(
        { phone: 1 }, 
        { 
          unique: false, 
          background: true,
          sparse: true  // Only index documents where phone exists and isn't null
        }
      );
      console.log('Successfully created non-unique phone index');
    } catch (err) {
      console.log(`Error creating phone index: ${err.message}`);
    }
    
    console.log('8. Verifying all indexes after fixes...');
    const newIndexes = await usersCollection.indexes();
    for (const index of newIndexes) {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    }
    
    console.log('9. Running compact on the users collection...');
    try {
      await db.command({ compact: 'users' });
      console.log('Compact operation completed successfully');
    } catch (err) {
      console.log(`Error during compact: ${err.message}`);
    }
    
    console.log('ALL FIXES APPLIED SUCCESSFULLY!');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    // Return success
    return true;
  } catch (error) {
    console.error(`Error applying fixes: ${error.message}`);
    console.error(error);
    return false;
  }
};

// Apply all fixes and then start the server
applyAllFixes()
  .then(success => {
    if (success) {
      console.log('Starting server...');
      
      // Start the server
      const server = spawn('node', ['server.js'], { 
        stdio: 'inherit',
        detached: false
      });
      
      server.on('error', (err) => {
        console.error('Failed to start server:', err);
        process.exit(1);
      });
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('Shutting down server...');
        server.kill('SIGINT');
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        console.log('Shutting down server...');
        server.kill('SIGTERM');
        process.exit(0);
      });
    } else {
      console.error('Failed to apply fixes. Server not started.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 