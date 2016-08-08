/* jshint node: true */

(function (factory) {
  module.exports = factory(require('fs'),
    require('winston'));
}(function (fs,
  winston) {

  try {
    fs.unlinkSync('app.log');
  } catch (ex) { }

  var cliLogger = new winston.Logger({
    transports: [
      new(winston.transports.Console)()
    ]
  });

  cliLogger.cli();

  var filelogger = null;


  filelogger = new winston.Logger({
    transports: [
      new(winston.transports.File)({
        filename: 'app.log',
        level: 'silly',
        prettyPrint: true
      })
    ]
  });

  return {
    cli: cliLogger,
    file: filelogger
  };
}));
