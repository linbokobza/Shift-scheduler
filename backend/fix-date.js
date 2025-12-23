const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shift-scheduler-admin';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db.collection('availabilities').updateOne(
      { employeeId: new mongoose.Types.ObjectId('68f9ae6efd9976ed2f2d90fa') },
      { $set: { weekStart: new Date('2025-11-09T00:00:00Z') } }
    );

    console.log('Updated:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
