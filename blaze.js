(function(factory) {
	module.exports = factory(require('fs'),
		require('backblaze-b2'),
		require('q'),
		require('lodash'));
}(function(fs,
	B2,
	q,
	_) {
		
	function Blaze(accountId, applicationKey) {
		this.accountId = accountId;
		this.applicationKey = applicationKey;
		this.b2 = new B2({
			accountId: this.accountId,
			applicationKey: this.applicationKey
		});
		this.authorized = null;
	};
	
	Blaze.prototype = {
		authorize: function () {
			
		},
	
		findPhotosBucket: function () {
			var that = this;
			return this.b2.authorize().then(function(b2) {
				return that.b2.listBuckets().then(function(response) {
					return _.find(response.buckets, { "bucketName": "mikejr83-photos"});
				});
			}, function(authError) {
				console.log('Authentication error', authError);
			});
		},
		
		_getFileList: function(startFilename) {
			
		},
		
		getAllFileInfo: function () {
			var that = this;
			return this.findPhotosBucket().then(function(photosBucket) {
				return that.b2.listFileNames({
					bucketId: photosBucket.bucketId,
					maxFileCount: 100
				}).then(function (filesResponse) {
					filesResponse.bucketId = photosBucket.bucketId;
					return filesResponse;
				});
			});
		},
		
		uploadFile: function (bucketId, filename, year) {
			var that = this;
				
			return this.b2.getUploadUrl(bucketId).then(function(uploadUrlResponse) {
				return that.b2.uploadFile({
					uploadUrl: uploadUrlResponse.uploadUrl,
					uploadAuthToken: uploadUrlResponse.authorizationToken,
					filename: year + '/'+ filename,
					data: fs.readFileSync(filename)
				});
			});
		}
	};
	
	return Blaze;
}));