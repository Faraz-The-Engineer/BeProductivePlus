const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function cleanupDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Drop the users collection to remove any old indexes
    console.log('Dropping users collection...');
    await db.collection('users').drop().catch(err => {
      console.log('Users collection might not exist or already dropped:', err.message);
    });
    
    // Drop any indexes that might conflict
    console.log('Cleaning up indexes...');
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      if (collection.name === 'users') {
        try {
          await db.collection('users').dropIndexes();
          console.log('Dropped all indexes from users collection');
        } catch (err) {
          console.log('No indexes to drop or error:', err.message);
        }
      }
    }
    
    console.log('Database cleanup completed successfully!');
    console.log('You can now restart your server and try signing up again.');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

cleanupDatabase(); 