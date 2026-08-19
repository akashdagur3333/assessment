const mongoose = require('mongoose');

async function connectDb() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mean-task-manager';

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}

module.exports = connectDb;
