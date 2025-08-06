const winston = require('winston')
const express = require('express')
const app = express()

require('dotenv').config();
require('./startup/config')()
require('./startup/logging')()
require('./startup/db')()

const port = process.env.PORT || 3000
const server = app.listen(port, ()=>winston.info(`Listening on port ${port}...`))


module.exports = server