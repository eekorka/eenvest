const mongoose = require('mongoose')
const { Schema } = mongoose

const sessionSchema = new Schema({
  createdAt: Date,
  username: String
}, {collection: 'sessions'})

const Session = mongoose.model('Session', sessionSchema)

module.exports = Session