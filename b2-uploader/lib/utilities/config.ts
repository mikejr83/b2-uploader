import fs = require('fs');

export const configFilename: string = 'config.json';

export interface LoggerConfig {
  level: string
}

export interface FileLoggerConfig extends LoggerConfig {
  filename: string;
  prettyPrint: boolean;
}

export interface Configuration {
  accountId: string;
  applicationKey: string;
  rootDirectory: string;
  domain: string;
  username: string;
  password: string;
  bucketName: string;
  cliLoggerConfiguration: LoggerConfig;
  fileLoggerConfiguration: FileLoggerConfig;
}

let config: Configuration = {
  accountId: null,
  applicationKey: null,
  rootDirectory: '.',
  domain: '\\',
  username: null,
  password: null,
  bucketName: null,
  cliLoggerConfiguration: {
    level: 'silly'
  },
  fileLoggerConfiguration: {
    filename: 'app.log',
    level: 'silly',
    prettyPrint: true
  }
};

if (fs.existsSync(configFilename)) {
  let rawConfig: Buffer = fs.readFileSync(configFilename);

  if (rawConfig) {
    let realConfig: Configuration = JSON.parse(rawConfig.toString());

    if (realConfig) {
      config = Object.assign(config, realConfig);
    }
  }
}

export { config };