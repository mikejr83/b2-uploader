(function (root, factory) {
  'use strict';

  factory(require('fs'),
    require('path'),
    require('./nas.js'),
	require('./blaze.js'),
    require('lodash'),
    require('q'));
}(this, function (fs,
  path,
  NAS,
  Blaze,
  _,
  Q,
  B2) {
  'use strict';

  var config = null;

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
	blaze = new Blaze(config.accountId, config.applicationKey);
	
  blaze.getAllFileInfo().then(function (result) {
	  var fileInfosSha1Hash = _.keyBy(result.files, 'contentSha1');
	  
	  nasWorker.getIterator().then(function (iterator) {
		var promise = null,
		  promises = [];

		while (promise = iterator.next()) {
		  promises.push(promise);
		}
		
		Q.all(promises).then(function (archiveInfos) {
		  _.forEach(archiveInfos, function(yearArchiveInfo) {
			  if(yearArchiveInfo != null && Array.isArray(yearArchiveInfo)){
				  _.forEach(yearArchiveInfo, function (monthArchiveInfo){
					  if(monthArchiveInfo != null && fileInfosSha1Hash[monthArchiveInfo.hash]) {
						  console.log('Month is already archived and does not need to be updated.', monthArchiveInfo.filename);
					  } else if(monthArchiveInfo != null){
						  blaze.uploadFile(result.bucketId, monthArchiveInfo.filename).then(function(uploadResponse) {
							 console.log('uploadResponse', uploadResponse); 
						  }, function (err) {
							  console.log('errr!', err);
						  });
					  }
				  });
			  }
		  });
		},
		  function (error) {
			console.log('crap', error);
		  });
	  });
  }, function(error) {
	  console.log('crap', error);
  });
	
  /*nasWorker.getIterator().then(function (iterator) {
    var promise = null,
      promises = [];

    while (promise = iterator.next()) {
      promises.push(promise);
    }

    Q.all(promises).then(function (archiveInfos) {
	  console.log('Creating archives complete.');
	  
	  
	},
	  function (error) {
		console.log('crap', error);
	  });
  });

  var b2 = new B2(config);

  b2.authorize().then(function () {
    b2.listBuckets().then(function (buckets) {
      console.log(buckets);
    })
  });*/
}));