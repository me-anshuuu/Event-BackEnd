import mongoose from "mongoose";

// Delete any previous model to ensure schema changes take effect
// This helps avoid issues with model redefinition during development
try {
  // Clean up any existing models to prevent duplicate model errors
  delete mongoose.models.User;
  delete mongoose.modelSchemas?.User;
} catch (error) {
  console.log("Model cleanup warning (can be ignored):", error.message);
}

// Define user schema without any indexes initially
const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true 
  },
  // Replace userId with a generated userCode field that won't be null
  userCode: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  // Add relevant user fields with proper defaults
  name: { 
    type: String,
    default: ""
  },
  phone: { 
    type: String,
    default: null, // Changed from "" to null to avoid empty string duplicates
    sparse: true   // Only index documents where this field exists
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  cartData: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Add timestamps for better tracking
  timestamps: true,
  // Allow extra fields that exist in the database but not in our schema
  strict: false,
  // Add collation for case-insensitive operations
  collation: { locale: 'en', strength: 2 }
});

// Pre-save hook to ensure userCode is set and phone is handled correctly
userSchema.pre('save', function(next) {
  if (!this.userCode) {
    this.userCode = new mongoose.Types.ObjectId().toString();
  }
  
  // Convert email to lowercase before saving
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  
  // Convert empty phone strings to null
  if (this.phone === "") {
    this.phone = null;
  }
  
  next();
});

// Create the model
const userModel = mongoose.model("User", userSchema);

// Create indexes programmatically if needed
const setupIndexes = async () => {
  try {
    // Check existing indexes
    const indexes = await userModel.collection.indexes();
    
    // Drop all email-related indexes first to avoid conflicts
    for (const index of indexes) {
      if (index.name !== '_id_' && index.key && index.key.email) {
        try {
          console.log(`Dropping existing email index ${index.name}...`);
          await userModel.collection.dropIndex(index.name);
          console.log(`Successfully dropped index ${index.name}`);
        } catch (err) {
          console.log(`Error dropping index ${index.name}:`, err.message);
        }
      }
      
      // Drop any phone indexes to ensure they're not unique
      if (index.name !== '_id_' && index.key && index.key.phone) {
        try {
          console.log(`Dropping existing phone index ${index.name}...`);
          await userModel.collection.dropIndex(index.name);
          console.log(`Successfully dropped phone index ${index.name}`);
        } catch (err) {
          console.log(`Error dropping phone index ${index.name}:`, err.message);
        }
      }
    }
    
    // Create new case-insensitive email index
    await userModel.collection.createIndex(
      { email: 1 }, 
      { 
        unique: true, 
        background: true,
        collation: { locale: 'en', strength: 2 }  // Makes the index case-insensitive
      }
    );
    console.log("Created case-insensitive email index on User collection");
    
    // Create userCode index if needed
    const hasUserCodeIndex = indexes.some(idx => idx.key && idx.key.userCode);
    if (!hasUserCodeIndex) {
      await userModel.collection.createIndex({ userCode: 1 }, { unique: true, background: true });
      console.log("Created userCode index on User collection");
    }
    
    // Create a non-unique, sparse phone index (only index non-empty values)
    await userModel.collection.createIndex(
      { phone: 1 }, 
      { 
        unique: false, 
        background: true,
        sparse: true  // Only index documents where phone exists and isn't null
      }
    );
    console.log("Created non-unique phone index on User collection");
    
    // Drop any userId index if it exists
    if (indexes.some(idx => idx.key && idx.key.userId)) {
      try {
        await userModel.collection.dropIndex('userId_1');
        console.log("Dropped userId index");
      } catch (err) {
        console.log("Error dropping userId index:", err.message);
      }
    }
  } catch (error) {
    console.error("Index setup error:", error.message);
  }
};

// Run index setup (this won't block application startup)
setupIndexes().catch(err => console.error("Index setup error:", err));

export default userModel;
