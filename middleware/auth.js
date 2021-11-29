const connectToMongoDB = require('../db/connection')
const User = require('../db/models/User')
const Session = require('../db/models/Session')

function auth(req, res, next) {
  connectToMongoDB()

  if (!req.cookies.cooka) {
    res.redirect('/login')
  }

  if (req.cookies.cooka) {
    Session.findOne({_id: req.cookies.cooka}, (error, session) => {
      if (error) {
        console.log(error)
        res.redirect('/login')
      }
  
      if (!session) {
        res.redirect('/login')
      }
  
      if (session) {
        User.findOne({username: session.username}, (error, user) => {
          if (error) {
            console.log(error);
          }
  
          if (user) {
            res.locals.user = user
            next()
          }
        })
      }
    })
  }
}

module.exports = auth