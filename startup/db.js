const winston = require('winston')
const mongoose = require('mongoose')
const config = require('config')

module.exports = function(){
    const db = process.env.DB
    mongoose.connect(db).then(()=>winston.info(`Connected to ${db}...`))
    .catch((err)=>winston.error('Could not connect because of ',err))
}