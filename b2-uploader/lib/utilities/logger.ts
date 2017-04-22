import fs = require('fs');
import * as winston from 'winston';

import { config } from './config';

class Logger {
  static current: Logger;

  cli: winston.LoggerInstance;
  file: winston.LoggerInstance;

  constructor() {
    let cannotRemovePreviousLog = false;

    try {
      fs.statSync(config.fileLoggerConfiguration.filename);
    } catch (e) {
      cannotRemovePreviousLog = true;
    }

    if (fs.existsSync(config.fileLoggerConfiguration.filename)) {
      try {
        fs.unlinkSync(config.fileLoggerConfiguration.filename);
      } catch (e) {
        cannotRemovePreviousLog = true;
      }
    }
    
    const cliLogger = new winston.Logger({
      transports: [
        new (winston.transports.Console)()
      ]
    });

    this.cli = cliLogger

    this.cli.cli();

    try {
      this.file = new winston.Logger({
        transports: [
          new winston.transports.File({
            filename: config.fileLoggerConfiguration.filename,
            level: config.fileLoggerConfiguration.level,
            prettyPrint: config.fileLoggerConfiguration.prettyPrint,
            stringify: function (obj) {
              return JSON.stringify(obj, null, 2);
            }
          })
        ]
      });
    } catch (e) {
      this.cli.error('Error trying to create file logger:', e);
    }
  }
}

Logger.current = new Logger();

export { Logger };