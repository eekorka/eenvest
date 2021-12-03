const mongoose = require('mongoose')
const { Schema } = mongoose

const userSchema = new Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    minlength: 2,
    maxlength: 20
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  token: {
    type: String,
    required: true
  },
  regDate: Date
}, {collection: 'users'})

const User = mongoose.model('User', userSchema)

module.exports = User