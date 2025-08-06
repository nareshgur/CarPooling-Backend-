const config = require('config')

module.exports =  function(){
    console.log(`The config value is  ${config.get('jwtPrivateKey')}`)
    if(!process.env.jwtPrivateKey){
        throw new Error('FATAL ERROR : jwtPrivateKey is not defined.')
    }
}