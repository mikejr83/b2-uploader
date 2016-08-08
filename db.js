/* jshint node: true */

(function (factory) {
  module.exports = factory(require('./logger.js'),
    require('q'),
    require('nedb'));
}(function (logger,
  Q,
  Datastore) {
  'use strict';

  function DB(filename) {
    this.db = null;
    this.dbOptions = {
      filename: filename,
      timestampData: true
    };
  }

  DB.prototype = {
    open: function () {
      var that = this;

      return Q.Promise(function (resolve, reject, notify) {
        logger.file.debug('Creating new data store.', that.dbOptions);

        that.db = new Datastore(that.dbOptions);

        that.db.loadDatabase(function (err) {
          if (err) {
            logger.file.error('There was an error loading the database for caching file information.');
            logger.cli.error('Caching info will not be available.');

            reject(err);
          } else {
            logger.file.debug('DB opened and loaded.');
            resolve(that.db);
          }
        });
      });
    },

    updateFileInfo: function (filename, hash) {
      var that = this;

      if (typeof (filename) === 'object') {
        hash = filename.hash;
        filename = filename.filename;
      }

      logger.file.debug('Updating file info', {
        filename: filename,
        hash: hash
      });

      return this.findFileInfo(hash).then(function (fileInfo) {
        if (!fileInfo || fileInfo.length) {
          // need to update
          return Q.Promise(function (resolve, reject) {
            that.db.update({
              hash: hash
            }, {
              hash: hash,
              filename: filename
            }, function (err, updated) {
              if (err) {
                reject(err);
              } else {
                resolve(updated);
              }
            });
          });
        } else {
          // need to add
          return Q.Promise(function (resolve, reject) {
            that.db.insert({
              hash: hash,
              filename: filename
            }, function (err, newRecord) {
              if (err) {
                reject(err);
              } else {
                resolve(newRecord);
              }
            });
          });
        }
      });
    },

    findFileInfo: function (hash) {
      var that = this;

      return Q.Promise(function (resolve, reject, notify) {
        that.db.find({
          hash: hash
        }, function (err, fileInfo) {
          if (err) {
            reject(err);
          } else {
            resolve(fileInfo);
          }
        });
      });
    },

    findFileInfoByFilename: function (filename) {
      var that = this;

      return Q.Promise(function (resolve, reject, notify) {
        that.db.find({
          filename: filename
        }, function (err, fileInfo) {
          if (err) {
            reject(err);
          } else {
            resolve(fileInfo);
          }
        });
      });
    }
  };

  return DB;
}));
