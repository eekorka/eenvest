const mongoose = require('mongoose')

async function connectToMongoDB() {
  await mongoose.connect(process.env.DB_URI)
}

module.exports = connectToMongoDB