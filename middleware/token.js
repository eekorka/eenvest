const Cryptr = require('cryptr')
const cryptr = new Cryptr(process.env.CRYPTR_SECRET)

function token(req, res, next) {
  const token = cryptr.decrypt(res.locals.user.token)
  res.locals.token = token
  next()
}

module.exports = token