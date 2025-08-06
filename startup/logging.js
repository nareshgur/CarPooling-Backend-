const winston = require('winston');
require('express-async-errors');

module.exports = function () {
  // Proper way to handle exceptions
  winston.exceptions.handle(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.prettyPrint()
      )
    }),
    new winston.transports.File({ filename: 'uncaughtExceptions.log' })
  );

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (ex) => {
    throw ex;
  });

  // Add file logging transport properly
  winston.add(new winston.transports.File({ filename: 'logfile.log' }));
};
