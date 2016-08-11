/* jshint node: true */

(function (factory) {
  module.exports = factory(require('fs'),
    require('winston'));
} (function (fs,
  winston) {

  var cannotRemovePreviousLog = false,
    logFilename = 'app.log';

  if (fs.existsSync(logFilename)) {
    try {
      fs.unlinkSync(logFilename);
    } catch (ex) {
      cannotRemovePreviousLog = true;
    }
  }

  var cliLogger = new winston.Logger({
    transports: [
      new (winston.transports.Console)()
    ]
  });

  cliLogger.cli();

  var filelogger = null;


  try {
    filelogger = new winston.Logger({
      transports: [
        new (winston.transports.File)({
          filename: logFilename,
          level: 'silly',
          prettyPrint: true,
          stringify: function (obj) {
            return JSON.stringify(obj, null, 2);
          }
        })
      ]
    });
  } catch (e) {

  }

  if (!filelogger || cannotRemovePreviousLog) {
    filelogger = new winston.Logger();
  }

  return {
    cli: cliLogger,
    file: filelogger
  };
}));
