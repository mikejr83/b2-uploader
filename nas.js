/* jshint node: true */

(function (root, factory) {
  'use strict';
  module.exports = factory(require('fs'),
    require('path'),
    require('crypto'),
    require('q'),
    require('promise-queue'),
    require('glob'),
    require('lodash'),
    require('./logger.js'));
}(this, function (fs,
  path,
  crypto,
  Q,
  Queue,
  glob,
  _,
  logger) {

  function NAS(share, rootDirectory, domain, username, password) {
    this.share = share;
    this.rootDirectory = rootDirectory;
    this.domain = domain;
    this.username = username;
    this.password = password;
  }

  NAS.prototype = {
    getFileList: function () {
      var deferred = Q.defer(),
        searchPath = path.join(this.share, this.rootDirectory, '**/*');

      logger.cli.info('Looking for all the files to upload:', searchPath);
      logger.file.info('Search path:', searchPath);

      glob(searchPath, function (err, files) {
        logger.file.debug('Glob finished:', files);
        deferred.resolve(files);
      });

      return deferred.promise;
    },

    getFileInfo: function () {
      var that = this;
      return this.getFileList().then(function (files) {
        logger.cli.info('Got your files to process...');
        logger.cli.info('Wow! Are you sure you want me to process ' + files.length + ' files!!! ;) Ok!');
        logger.cli.info('Going to do some hashing on them and compare that to what\'s in the cloud.');
        logger.file.debug('Have the file list', files.length);

        var promises = [];

        var que = new Queue(10, Infinity);

        _.forEach(files, function (file) {
          if (file.indexOf('Thumbs.db') >= 0 ||
            file.indexOf('Picasa.ini') >= 0) return;

          promises.push(que.add(function () {
            return Q.Promise(function (resolve, reject, notify) {
              var input = fs.createReadStream(file),
                hash = crypto.createHash('sha1');

              logger.file.debug('Hasing:', file);

              hash.setEncoding('hex');

              input.on('end', function () {
                hash.end();

                var fileInfo = {
                  filename: file,
                  hash: hash.read()
                };

                logger.file.debug('Got hash for ' + file, fileInfo.hash);

                resolve(fileInfo);
              });

              input.on('error', function (err) {
                logger.file.error('Error hashing file: ' + file, err);

                reject(err);
              });

              input.pipe(hash);
            });
          }));
        });

        return promises;
      });
    }
  };

  return NAS;

}));
