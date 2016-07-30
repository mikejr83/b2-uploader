/* jshint node: true */

(function (factory) {
  module.exports = factory(require('fs'),
    require('backblaze-b2'),
    require('q'),
    require('lodash'),
    require('./logger.js'));
}(function (fs,
  B2,
  q,
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

    _getFileList: function (startFilename) {

    },

    getAllFileInfo: function () {
      var that = this;
      return this.findBucket().then(function (targetBucket) {
        return that.b2.listFileNames({
          bucketId: targetBucket.bucketId,
          maxFileCount: 100
        }).then(function (filesResponse) {
          filesResponse.bucketId = targetBucket.bucketId;
          return filesResponse;
        });
      });
    },

    uploadFile: function (bucketId, filename, remoteFilename) {
      var that = this;

      return this.b2.getUploadUrl(bucketId).then(function (uploadUrlResponse) {
        var uploadInfo = {
          uploadUrl: uploadUrlResponse.uploadUrl,
          uploadAuthToken: uploadUrlResponse.authorizationToken,
          filename: remoteFilename
        };

        logger.file.debug('Uploading', uploadInfo);

        try {
          uploadInfo.data = fs.readFileSync(filename);
        } catch (e) {
          logger.file.error('File read error!', e);
          return e;
        }


        return that.b2.uploadFile(uploadInfo);
      }, function (err) {
        logger.file.error('Unable to get upload url.', err);
      });
    }
  };

  return Blaze;
}));
