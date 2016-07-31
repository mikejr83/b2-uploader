/* jshint node: true */

(function (root, factory) {
  'use strict';

  factory(require('fs'),
    require('path'),
    require('winston'),
    require('./nas.js'),
    require('./blaze.js'),
    require('./logger.js'),
    require('lodash'),
    require('q'),
    require('promise-queue'));
}(this, function (fs,
  path,
  winston,
  NAS,
  Blaze,
  logger,
  _,
  Q,
  Queue) {
  'use strict';

  var config = null;

  logger.cli.info('Welcome to the backblaze b2 uploader!');

  if (fs.existsSync('config.json')) {
    config = fs.readFileSync('config.json');
    if (config) {
      config = JSON.parse(config.toString());
    }
  }

  config = config || {
    accountKId: '',
    applicationKey: ''
  };

  var nasWorker = new NAS(config.share, config.rootDirectory, config.domain, config.username, config.password),
    blaze = new Blaze(config.accountId, config.applicationKey, config.bucketName);

  blaze.getAllFileInfo().then(function (result) {
    logger.cli.info('Great news! I was able to get all your file information from backblaze!');
    logger.cli.info(result.files.length + ' is a lot of files! ;)');
    logger.file.debug('Get All File Info Results From B2:', result);

    var fileInfosSha1Hash = _.keyBy(result.files, 'contentSha1');

    logger.cli.info('Now I\'m going to get the information about your local files. I\'ll then batch up the uploads for the missing files!');
    nasWorker.getFileInfo().then(function (promises) {
      logger.file.debug('Working with ' + promises.length + ' promises');

      var que = new Queue(10, Infinity);

      _.forEach(promises, function (promise) {
        promise.then(function (fileInfo) {
          logger.file.debug('Got the file info to check.', fileInfo);

          if (!fileInfosSha1Hash[fileInfo.hash]) {
            var remoteFilename = path.relative(path.join(config.share, config.rootDirectory), fileInfo.filename)
              .replace(/\s/, '_')
              .split(path.sep)
              .join('/');

            logger.cli.info('Queuing upload for ' + fileInfo.filename);
            logger.file.debug('Queuing upload for ' + fileInfo.filename);

            que.add(function () {
              logger.file.debug('Starting upload for ' + fileInfo.filename);
              return blaze.uploadFile(result.bucketId, fileInfo.filename, remoteFilename).then(function (uploadResponse) {
                return uploadResponse;
              }, function (ugh) {
                console.log('ugh something happened', ugh);
              });
            }).then(function (dealie) {
              logger.file.debug('Upload promised resolved.', dealie);
            }, function (err) {
              logger.cli.error('An error on upload!');
              logger.file.error('An error on upload. This comes from the que.add call.', err);
            });
          } else {
            logger.cli.info('Backblaze already has this file:', fileInfo.filename);
          }
        });
      });

      var queueCheck = function () {
        var queueLength = que.getQueueLength();
        console.log('Queue pending length: ' + queueLength);
          _.delay(queueCheck, 5000);
      };

      _.delay(queueCheck, 5000);
    });
  }, function (error) {
    logger.file.error('Oh stool!', error);
  });
}));
