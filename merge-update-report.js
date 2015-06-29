var debug = require("debug")("RunIndex")
var Fulfillment = require("spexpress")
var Stitch = require("stitchlabs")
var Promise = require("bluebird")
var _ = require("underscore")
var mergedVariants = require("./merged-variants-v2")
var updateStock = require("./update-stock")
var writeReport = require("./write-report")

var stitch = new Stitch({
  accessToken: process.env.STITCH_ACCESS_TOKEN,
  consumerUrl: process.env.STITCH_URL,
  cacheDir: "./cache",
  cacheOverrde: false,
  pageSize: 5,
  //cacheAlive: ((24 * 60) * 60) * 2
  cacheAlive: ((1 * 60) * 60)
})

var fulfillment = new Fulfillment({
  "host": process.env.FTP_HOST,
  "user": process.env.FTP_USERNAME,
  "password": process.env.FTP_PASSWORD,
})

function leadIt(collection, key){
  return _.map(collection, function(variant){
    var temp = {}
    temp[key] = variant
    return temp
  })
}

function readyReport(message){
  return function(variant){
    var temp = {}
    temp["stitch_description"] = (variant.stitch) ? variant.stitch.auto_description : false
    temp["stitch_id"] = (variant.stitch) ? variant.stitch.id : false
    temp["stitch_url"] = (variant.stitch) ? stitch.getVariantUrl(variant.stitch) : false
    temp["stitch_sku"] = (variant.stitch) ? variant.stitch.sku : false
    temp["stitch_stock"] = (variant.stitch) ? variant.stitch.stock : false
    temp["mss_sku"] = (variant.mss) ? variant.mss.ITEM : false
    temp["mss_stock"] = (variant.mss) ? variant.mss.QTY : false
    temp["message"] = message
    temp["response"] = function(){
      if(variant.response && variant.response.length == 0) return "uploaded successfully"
      if(variant.response) variant.response
      return "no response"
    }()
    return temp
  }
}

function errorReport(data){
  return _.flatten([
    _.map(leadIt(data.stitchVariantsMissingSku, "stitch"), readyReport("stitch missing sku")),
    _.map(leadIt(data.stitchVariantsDuplicateSkus, "stitch"), readyReport("stitch duplicate skus")),
    _.map(leadIt(data.mssVariantsMissingInStitch, "mss"), readyReport("mss missing in stitch")),
  ])
}

function runReports(data, variants){
  return writeReport([
    {
      content: errorReport(data),
      name: "Stitch Quantity Error Report"
    },
    {
      content: _.map(variants, readyReport("quantity update requested")),
      name: "Stitch Quantity Change Report"
    }
  ])
}

var fakeProduct = [
  {
    "stitch": {
      "id": 88157718,
      "links": {
        "Products": [
          {
            "id": 42603630
          }
        ]
      }
    },
    "mss": {
      "QTY": 1337
    }
  }
]

function main(){
  return mergedVariants(stitch, fulfillment)
    .then(function(data){
      return updateStock(stitch, {
        "update": _.first(data.mssVariantsUpdatable, 5),
        //"update": fakeProduct,
        "mss": data.mss
      }).then(function(variants){
        return runReports(data, variants).then(function(responses){
          _.each(responses, function(response){
            debug("drive generated %s", response.alternateLink)
          })
        })
      })
    })
}

module.exports = main
