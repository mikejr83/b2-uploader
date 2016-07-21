(function (root, factory) {
  'use strict';

  factory(require('fs'),
    require('path'),
    require('./nas.js'),
    require('lodash'),
    require('q'),
    require('backblaze-b2'));
}(this, function (fs,
  path,
  NAS,
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

  var nasWorker = new NAS(config.share, config.rootDirectory, config.domain, config.username, config.password);
  nasWorker.getIterator().then(function (iterator) {
    var promise = null,
      promises = [];

    while (promise = iterator.next()) {
      promises.push(promise);
    }

    Q.all(promises).then(function () {
        console.log('done');
      },
      function () {
        console.log('crap');
      });
  });


  console.log(nasWorker);

  console.log(config);

  /*var b2 = new B2(config);

  b2.authorize().then(function () {
    b2.listBuckets().then(function (buckets) {
      console.log(buckets);
    })
  });*/
}));