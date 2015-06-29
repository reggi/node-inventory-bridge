var debug = require("debug")("WriteReport")
var moment = require("moment")
var Promise = require("bluebird")
var fs = Promise.promisifyAll(require("fs"))
var google = require('googleapis')
var _ = require("underscore")
var googleAuth = require("./google-auth")
var csv = Promise.promisifyAll(require("csv"))

var uploadParentFolder = process.env.GD_FILE_UPLOAD_PARENT_ID

function parseAndUpload(drive, item){
  debug("uploading file %s", item.name)
  return csv.stringifyAsync(item.content, {header: true})
    .then(function(content){
      item.content = content
      return drive.files.insertAsync({
        newRevision: false,
        convert: true,
        resource: {
          title: item.name,
          mimeType: 'text/csv',
          parents: [{"id":uploadParentFolder}],
        },
        media: {
          mimeType: 'text/csv',
          body: item.content,
        }
      }).spread(function(data, response){
        return data
      })
    })
}

function uploadFiles(files){
  return googleAuth().then(function(oauth2Client){
    drive = google.drive({ version: 'v2', auth: oauth2Client })
    drive.files = Promise.promisifyAll(drive.files)
    return drive
  })
  .then(function(drive){
    var filePromises = _.map(files, function(file){
      file.name = [file.name, moment().format("MM/DD/YYYY h:mm:ss a")].join(" ")
      return parseAndUpload(drive, file)
    })
    return Promise.all(filePromises)
  })
}

module.exports = uploadFiles
