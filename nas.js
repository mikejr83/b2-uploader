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
} (this, function (fs,
  path,
  crypto,
  Q,
  Queue,
  glob,
  _,
  logger) {

  function NAS(dbProvider, rootDirectory, domain, username, password) {
    this.dbProvider = dbProvider;
    this.rootDirectory = rootDirectory;
    this.domain = domain;
    this.username = username;
    this.password = password;
    this.que = new Queue(10, Infinity);
  }

  NAS.generateFileHash = function (file) {
    return Q.Promise(function (resolve, reject, notify) {
      try {
        fs.lstat(file, function (err, stats) {
          if (!err && stats && stats.isFile()) {
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
              logger.cli.error('Error ocurred hashing ' + file);
              logger.file.error('Error hashing file: ' + file, err);

              reject(err);
            });

            input.pipe(hash);
          } else if (err) {
            logger.file.warning('Having an issue hashing the file:', err, file);
            reject(err);
          } else {
            logger.file.debug('The stat is for something that is not a file.', file);
            reject();
          }
        });
      } catch (e) {
        logger.cli.error('lstat failed.', e);
        reject(e);
      }
    });
  };

  NAS.prototype = {
    _hashesCache: {

    },

    getFileList: function () {
      var that = this;

      return Q.promise(function (resolve, reject, notify) {
        var searchPath = path.join(that.rootDirectory, '**/*');

        logger.cli.info('Looking for all the files to upload:', searchPath);
        logger.file.info('Search path:', searchPath);

        glob(searchPath, function (err, files) {
          if (err) {
            logger.cli.error('Ooops. Can\'t get the file list.', err);
            reject(err);
          } else {
            logger.file.debug('Glob finished:', files);
            resolve(files);
          }
        });
      });
    },

    getInfoForFiles: function (files) {
      var that = this,
        promises = [];

      _.forEach(files, function (file) {
        if (file.indexOf('Thumbs.db') >= 0 ||
          file.indexOf('Picasa.ini') >= 0) return;

        var infoPromise = that.que.add(function () {
          return NAS.generateFileHash(file);
        });

        promises.push(infoPromise);
      });

      return promises;
    }
  };

  return NAS;

}));
