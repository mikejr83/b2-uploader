(function (root, factory) {
  'use strict';
  module.exports = factory(require('fs'),
    require('path'),
    require('q'),
    require('lodash'),
    require('node-7z'),
    require('smb2'));
}(this, function (fs,
  path,
  Q,
  _,
  SevenZip,
  SMB) {

  function getDirectories(srcpath) {
    return fs.readdirSync(srcpath).filter(function (file) {
      return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
  }

  function Iterator(collection, handler) {
    this.collection = collection;
    this.handler = handler;
    this.counter = 0;
  }

  Iterator.prototype = {
    next: function () {
      if (this.collection.length > this.counter) {
        var promise = this.handler(this.collection[this.counter]).then(function (result) {
          console.log('iteration result', result);
          return result;
        });

        this.counter++;

        return promise;
      } else {
        return null;
      }
    }
  }

  function NAS(share, rootDirectory, domain, username, password) {
    this.share = share;
    this.rootDirectory = rootDirectory;
    this.domain = domain;
    this.username = username;
    this.password = password;
  }

  NAS.prototype = {
    getYears: function () {
      var deferred = Q.defer();

      deferred.resolve(fs.readdirSync(path.join(this.share, this.rootDirectory)));

      return deferred.promise;
    },
    handleMonth: function (monthInfo) {
      var deferred = Q.defer(),
        zip = new SevenZip();

      var monthPath = path.join(this.share, this.rootDirectory, monthInfo.year, monthInfo.month);
      
      
      
      console.log('month', monthPath);
      deferred.resolve(monthPath);

      return deferred.promise;
    },
    handleYear: function (year) {
      var deferred = Q.defer();

      var yearPath = path.join(this.share, this.rootDirectory, year);

      //      zip.add(year + '.7z', yearPath).then(function() {
      //        deferred.resolve();
      //      }).catch(function(err) {
      //        console.log('ERROR!', err);
      //        deferred.reject();
      //      });



      try {
        var months = _.map(fs.readdirSync(yearPath), function (month) {
          return {
            month: month,
            year: year
          }
        })
        var i = new Iterator(months, this.handleMonth.bind(this)),
          month = null;

        var promises = [];

        while (month = i.next()) {
          promises.push(month);
        }
        
        return Q.all(promises).then(function (months) {
          console.log('months', months);
        }, function () {
          console.log('ooooooooooooooooooooooooooooo');
        });

      } catch (e) {
        console.log(e);
        deferred.reject(e);
      }




      return deferred.promise;
    },
    getIterator: function () {
      var promise = this.getYears(),
        that = this;

      return promise.then(function (years) {
        return new Iterator(years, that.handleYear.bind(that));
      }, function (err) {
        console.log('err', err);
      });
    }
  }

  return NAS;

}));