const mongoose = require('mongoose');
const Session = require('../models/Session');

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is missing from the backend .env file');
  }

  await mongoose.connect(uri);
  await Session.init();
  console.log('MongoDB connected successfully');
}

module.exports = connectDatabase;
