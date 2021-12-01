const express = require('express')
const router = express.Router()

const bcrypt = require('bcrypt')
const Cryptr = require('cryptr')
const uaParser = require('ua-parser-js')

const connectToMongoDB = require('../db/connection')
const User = require('../db/models/User')
const Session = require('../db/models/Session')

router.get('/login', (req, res) => {
  res.render('login')
})

router.post('/login', (req ,res) => {
  connectToMongoDB()

  User.findOne(
    {
      username: req.body.username
    }, (err, user) => {
    if (!user) {
      res.redirect('/login')
    }
  
    if (user) {
      bcrypt.compare(req.body.password, user.password, (error, result) => {
        if (error) {
          console.log(error)
          res.redirect('/login')
        }

        if (result === false) {
          res.redirect('/login')
        }

        if (result === true) {
          const session = new Session({
            createdAt: new Date(),
            username: user.username,
            os: uaParser(req.headers['user-agent']).os.name,
            browser: uaParser(req.headers['user-agent']).browser.name
          })
          session.save((err) => {
            res.cookie('cooka', session._id, {expires: new Date(Date.now() + (60000 * 60 * 2))}).redirect('/')
          })
        }
      })
    }
  })
})

router.get('/registration', (req, res) => {
  res.render('registration')
})

router.post('/registration', async (req, res) => {
  connectToMongoDB()

  const cryptr = new Cryptr(process.env.CRYPTR_SECRET)

  const user = new User({
    username: req.body.username,
    password: await bcrypt.hash(req.body.password, process.env.SALT),
    token: cryptr.encrypt(req.body.token)
  })

  user.save()

  res.redirect('/login')
})

router.get('/logout', (req, res) => {
  connectToMongoDB()
  Session.deleteOne({_id: req.cookies.cooka}, (error) => {
    if (error) {
      console.log(error);
    }
  })
  res.clearCookie('cooka').redirect('/login')
})

module.exports = router