(function (root, factory) {
  'use strict';
  module.exports = factory(require('fs'),
    require('path'),
	require('crypto'),
    require('q'),
    require('lodash'),
    require('archiver'),
    require('smb2'));
}(this, function (fs,
  path,
  crypto,
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
	this.executing = 0;
	this.max = 2;
  }

  Iterator.prototype = {
	wait: function (item) {
	  var deferred = Q.defer(),
	    that = this;
		
	  _.delay(function () {
	    if (that.executing < that.max) {
			that.executing++;
			deferred.resolve(that.handler(item).then(function(result) {
			  that.executing--;
			  return result;
			}));
		} else {
			deferred.resolve(that.wait(item));
		}
	  }, 1000, item);
	  
	  return deferred.promise;
	},
	
    next: function () {
	  var that = this;
	  
      if (this.collection.length > this.counter) {
		var promise = null;
		if (this.executing < this.max) {
		  this.executing++;
		  promise = this.handler(this.collection[this.counter]).then(function (result) {
            that.executing--;
			return result;
          });
		} else {
		  promise = this.wait(this.collection[this.counter]);
		}
		  
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
        archive = archiver('tar'),
		archiveFilename = monthInfo.year + '_' + monthInfo.month + '.tar',
		monthPath = path.join(this.share, this.rootDirectory, monthInfo.year, monthInfo.month),
		hash = crypto.createHash('sha1');	

		hash.setEncoding('hex');
      
	  if(monthInfo.year == "2007" && monthPath.indexOf('.DS_Store') < 0) {
		  var output = fs.createWriteStream(archiveFilename);
		
		  archive.on('end', function() {
			  var input = fs.createReadStream(archiveFilename)
			  
			  input.on('end', function() {
			    hash.end();
				
				console.log('Completed ' + monthInfo.year + ' - ' + monthInfo.month);
				
			    deferred.resolve({
				  "month": monthInfo.month,
				  "year": monthInfo.year,
				  "filename": archiveFilename,
				  "hash": hash.read()
				});  
			  });
			  
			  input.pipe(hash);
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