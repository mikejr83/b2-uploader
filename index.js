/* jshint node: true */

(function (root, factory) {
  'use strict';

  factory(require('fs'),
    require('path'),
    require('winston'),
    require('./nas.js'),
    require('./blaze.js'),
    require('./db.js'),
    require('./logger.js'),
    require('lodash'),
    require('q'),
    require('promise-queue'),
    require('moment'));
}(this, function (fs,
  path,
  winston,
  NAS,
  Blaze,
  DB,
  logger,
  _,
  Q,
  Queue,
  moment) {
  'use strict';

  // APARENTLY, this is important...
  Queue.configure(Q.Promise);

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

  var dbProvider = new DB('test.db.json');
  dbProvider.open();

  var nasWorker = new NAS(dbProvider, config.rootDirectory, config.domain, config.username, config.password),
    blaze = new Blaze(config.accountId, config.applicationKey, config.bucketName),
    normalizedPath = config.rootDirectory.replace(/\\/gi, '/');

  blaze.getAllFileInfo()
    .then(function (result) {
      logger.cli.info('Great news! I was able to get all your file information from backblaze!');
      logger.cli.info(result.files.length + ' is a lot of files! ;)');
      logger.file.debug('Get All File Info Results From B2:', result);

      var fileInfosSha1Hash = _.keyBy(result.files, 'contentSha1'),
        que = new Queue(10, Infinity),
        queueCheck = function () {
          var queueLength = que.getQueueLength();
          console.log('Queue pending length: ' + queueLength);
          _.delay(queueCheck, 5000);
        };

      logger.cli.info('Now I\'m going to get the information about your local files. I\'ll then batch up the uploads for the missing files!');

      function checkFiles(files) {
        var promises = [];

        _.forEach(files, function (file) {

          var dbPromise = dbProvider.findFileInfoByFilename(file).then(function (cachedFileInfo) {
            if (cachedFileInfo && cachedFileInfo.length) { // file's info was cached locally
              cachedFileInfo = cachedFileInfo[0];

              var b2FileInfo = null,
                b2UpdatedAt = null,
                now = moment.utc(),
                dbUpdatedAt = moment(cachedFileInfo.updatedAt);

              dbUpdatedAt.utc();
              dbUpdatedAt.add(1, 'w');

              if (fileInfosSha1Hash[cachedFileInfo.hash]) {
                // b2 has this file and the db hash and b2 hash match
                b2FileInfo = fileInfosSha1Hash[cachedFileInfo.hash];

                // update the information locally
                return dbProvider.updateFileInfo(cachedFileInfo.filename, cachedFileInfo.hash)
                  .then(function () {
                    return null;
                  });
              } else if (cachedFileInfo.uploaded && now.isAfter(dbUpdatedAt)) {
                return file;
              } else {
                return null;
              }
            } else { // file's info was not cached locally
              return file;
            }
          });

          promises.push(dbPromise);
        });

        return Q.allSettled(promises).then(function (results) {
          return _.chain(results)
            .filter({
              state: 'fulfilled'
            })
            .map('value')
            .compact()
            .value();
        });
      }

      function uploadFile(fileInfo) {
        return que.add(function () {
          var remotePath = null;

          try {
            remotePath = path.relative(config.rootDirectory, fileInfo.filename).replace(/\\/gi, '/').replace(/\s/gi, '_');
          } catch (e) {
            return;
          }

          return blaze.uploadFile(result.bucketId,
            fileInfo.filename,
            remotePath);
        });
      }

      nasWorker.getFileList()
        .then(checkFiles)
        .then(nasWorker.getInfoForFiles.bind(nasWorker))
        .then(function (hashPromises) {
          var promises = [];

          _.forEach(hashPromises, function (promise) {
            var uploadPromise = promise
              .then(function (fileInfo) {
                return dbProvider.updateFileInfo(fileInfo);
              })
              .then(uploadFile)
              .then(function (uploadResult) {
                // Upload Completed!
                logger.file.debug('Upload completed!', uploadResult);

                if (uploadResult && uploadResult.filename) {
                  logger.cli.info('Upload completed for ' + uploadResult.filename + ' (' + uploadResult.response + ')');
                }
              });

            promises.push(uploadPromise);
          });

          return promises;
        }).then(function (uploadPromises) {
          return Q.allSettled(uploadPromises);
        })
        .then(function (result) {
          logger.cli.info('Completed the upload process! Yea!');
          logger.file.info('All the promises are resolved.', result);
        });
    }, function (error) {
      logger.file.error('Oh stool!', error);
    });
}));
