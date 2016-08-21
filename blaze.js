/* jshint node: true */

(function (factory) {
  module.exports = factory(require('fs'),
    require('backblaze-b2'),
    require('q'),
    require('lodash'),
    require('./logger.js'));
} (function (fs,
  B2,
  Q,
  _,
  logger) {

  function Blaze(accountId, applicationKey, bucketName) {
    this.accountId = accountId;
    this.applicationKey = applicationKey;
    this.bucketName = bucketName;
    this.b2 = new B2({
      accountId: this.accountId,
      applicationKey: this.applicationKey
    });
    this.authorized = null;
  }

  Blaze.prototype = {
    authorize: function () {

    },

    findBucket: function () {
      logger.file.debug('Finding the bucket.', this.bucketName);
      var that = this;
      return this.b2.authorize().then(function (b2) {
        return that.b2.listBuckets().then(function (response) {
          logger.file.debug('Have buckets response.', response);
          return _.find(response.buckets, {
            "bucketName": that.bucketName
          });
        });
      }, function (authError) {
        logger.cli.error('Unable to connecto to your B2 account. Check your creds.');
        logger.file.error('Auth error?', authError);
      });
    },

    _getFileList: function (bucketId, lastFileInfo) {
      var that = this;

      return this.b2.listFileNames({
        bucketId: bucketId,
        maxFileCount: 100,
        startFileName: lastFileInfo.fileName
      }).then(function (filesResponse) {
        if (filesResponse.code && filesResponse.code === 'bad_json') {
          throw 'Bad JSON';
        }

        filesResponse.bucketId = bucketId;

        if (filesResponse.files.length == 100) {
          logger.cli.info('You have a lot of files! Let me look for more!');
          return that._getFileList(bucketId, _.last(filesResponse.files)).then(function (aggregateResponse) {
            filesResponse.files = _.concat(filesResponse.files, aggregateResponse.files);

            return filesResponse;
          });
        } else {
          return filesResponse;
        }
      });
    },

    getAllFileInfo: function () {
      var that = this;

      logger.file.debug('Getting file info from b2.');

      return this.findBucket().then(function (targetBucket) {
        return that.b2.listFileNames({
          bucketId: targetBucket.bucketId,
          maxFileCount: 100
        }).then(function (filesResponse) {
          filesResponse.bucketId = targetBucket.bucketId;

          if (filesResponse.files.length == 100) {
            logger.cli.info('You have a lot of files! Let me look for more!');

            return that._getFileList(targetBucket.bucketId, _.last(filesResponse.files)).then(function (aggregateResponse) {
              filesResponse.files = _.concat(filesResponse.files, aggregateResponse.files);

              return filesResponse;
            });
          } else {
            return filesResponse;
          }
        });
      });
    },

    uploadFile: function (bucketId, filename, remoteFilename) {
      var that = this;

      function createUploadInfo(uploadUrlResponse) {
        return Q.promise(function (resolve, reject, notify) {
          var uploadInfo = {
            uploadUrl: uploadUrlResponse.uploadUrl,
            uploadAuthToken: uploadUrlResponse.authorizationToken,
            filename: remoteFilename
          };

          logger.file.debug('Uploading', uploadInfo);

          try {
            uploadInfo.data = fs.readFile(filename, function (err, data) {
              if (err) {
                reject(err);
              } else {
                uploadInfo.data = data;
                resolve(uploadInfo);
              }
            });
          } catch (e) {
            logger.file.error('File read error! File: ' + filename, e);
            reject(e);
          }
        });
      }

      return this.b2.getUploadUrl(bucketId)
        .then(createUploadInfo)
        .then(this.b2.uploadFile.bind(this.b2))
        .then(function (uploadResponse) {
          if (uploadResponse.code == 503) {
            logger.cli.warn('b2 returned 503. Trying again!');

            return that.uploadFile(bucketId, filename, remoteFilename);
          } else {
            var responseWithFilename = {
              response: uploadResponse,
              filename: filename
            };

            console.log('RESPONSE', responseWithFilename);

            return responseWithFilename;
          }
        });
      //.then(function (uploadInfo) {


      //  return that.b2.uploadFile(uploadInfo).then(function (uploadResponse) {
      //    if (uploadResponse.code == 503) {
      //      logger.cli.warn('b2 returned 503. Trying again!');

      //      return that.uploadFile(bucketId, filename, remoteFilename);
      //    } else {
      //      var responseWithFilename = {
      //        response: uploadResponse,
      //        filename: filename
      //      };

      //      console.log('RESPONSE', responseWithFilename);

      //      return responseWithFilename;
      //    }
      //  }, function (uploadError) {
      //    logger.cli.warn('Upload error', uploadError);
      //  });
      //}, function (err) {
      //  logger.file.error('Unable to get upload url.', err);
      //});
    }
  };

  return Blaze;
}));
