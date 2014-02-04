var fs = require('fs-extra'),
	admzip = require('adm-zip');


process.on('message', function(message, callback) {
	if (!message.thingContentLocation){
		return callback("Unable to Zip, missing thingContentLocation", this);
	}
    var zip = new admzip();
    var realPath = fs.realpathSync(message.thingContentLocation);
    zip.addLocalFolder(realPath);
    zip.writeZip(message.thingZipLocation);
    callback(null, realPath);
});