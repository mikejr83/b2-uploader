(function (root, factory) {
  'use strict';
  module.exports = factory(require('fs'),
    require('path'),
    require('q'),
    require('lodash'),
    require('archiver'),
    require('smb2'));
}(this, function (fs,
  path,
  Q,
  _,
  archiver,
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
        archive = archiver('zip'),
		archiveFilename = monthInfo.year + '_' + monthInfo.month + '.zip',
		monthPath = path.join(this.share, this.rootDirectory, monthInfo.year, monthInfo.month);
		
      
	  if(monthInfo.year == "2005" && monthPath.indexOf('.DS_Store') < 0) {
		  var output = fs.createWriteStream(archiveFilename);
		
		  archive.on('end', function() {
			  console.log('Completed ' + monthInfo.year + ' - ' + monthInfo.month);
			  deferred.resolve(archiveFilename); 
		  });
		  
		  archive.on('error', function(err){
			  console.log('Error', monthInfo, err);
			 deferred.reject(err); 
		  });
		  
		  archive.pipe(output);
		  
		  archive.directory(monthPath, path.join(monthInfo.year, monthInfo.month));
		  
		  archive.finalize();
		  
		  console.log('Zipping:', monthPath);
	  } else {
		  console.log('skipping', monthInfo);
		  deferred.resolve(null);
	  }

      return deferred.promise;
    },
    handleYear: function (year) {
      var deferred = Q.defer();

      var yearPath = path.join(this.share, this.rootDirectory, year);

	  if(yearPath.indexOf('.DS_Store') >= 0) {
		  console.log('Skipping a .DS_Store!');
		  deferred.resolve();
	  } else {	  
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
			
			return Q.all(promises).then(function (archivePaths) {
			  console.log('Done processing year:', year);
			  
			  return archivePaths;
			}, function () {
			  console.log('ooooooooooooooooooooooooooooo');
			});

		  } catch (e) {
			console.log(e);
			deferred.reject(e);
		  }
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