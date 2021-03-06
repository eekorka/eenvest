const express = require('express')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')

const app = express()

require('dotenv').config()

app.set('view engine', 'pug')

app.use(helmet())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())

app.use(require('./routes/main'))
app.use(require('./routes/login'))

const port = process.env.PORT

app.listen(port, () => {
    console.log('Server started and available at http://localhost:' + port)
  }
)