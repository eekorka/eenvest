const mongoose = require('mongoose')
const { Schema } = mongoose

const userSchema = new Schema({
  username: String,
  password: String,
  token: String
}, {collection: 'users'})

const User = mongoose.model('User', userSchema)

module.exports = User