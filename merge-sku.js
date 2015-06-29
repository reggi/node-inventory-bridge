var debug = require("debug")("MergeSku")
var Promise = require("bluebird")
var _ = require("underscore")

function main(stitch, fulfillment){
  return Promise.props({
    "FulfillmentInventory": fulfillment.inventory(),
    "Products": stitch.requestAll("api2/v2/Products"),
    "AccountAddresses": stitch.requestAll("api2/v2/AccountAddresses"),
  })
    .then(function(data){

      data.mss = _.findWhere(data.AccountAddresses.AccountAddresses, {"company": "MSS Fulfillment"})

      data.stitchVariantsMissingSku = _.chain(data.Products.Variants)
        .filter(function(variant){
          if(variant.sku == "null") return true
          if(variant.sku == null) return true
          return false
        })
        .value()

      data.stitchDuplicateSkus = _.chain(data.Products.Variants)
        .filter(function(variant){
          if(variant.sku !== "null") return true
          if(variant.sku !== null) return true
          return false
        })
        .groupBy("sku")
        .filter(function(skus){
          return skus.length > 1
        })
        .keys()
        .value()

      data.stitchVariantsDuplicateSkus = _.chain(data.Products.Variants)
        .filter(function(variant){
          if(variant.sku !== "null") return true
          if(variant.sku !== null) return true
          return false
        })
        .groupBy("sku")
        .filter(function(skus){
          return skus.length > 1
        })
        .values()
        .flatten()
        .value()

      data.stitchVariants = _.chain(data.Products.Variants)
        .filter(function(variant){
          if(variant.sku !== "null") return true
          if(variant.sku !== null) return true
          return false
        })
        .groupBy("sku")
        .filter(function(skus){
          return skus.length == 1
        })
        .values()
        .flatten()
        .value()

      data.mssVariantsMerged = _.chain(data.FulfillmentInventory)
        .map(function(variant){
          return {
            "mss": variant,
            "stitch": _.findWhere(data.stitchVariants, {
              "sku": variant.ITEM
            })
          }
        })
        .value()

      data.mssVariantsInStitch = _.chain(data.mssVariantsMerged)
        .filter(function(variant){
          return variant.stitch
        })
        .value()

      data.mssVariantsMissingInStitch = _.chain(data.mssVariantsMerged)
        .filter(function(variant){
          return !variant.stitch
        }).map(function(variant){
          return variant.mss
        })
        .value()

      data.mssVariantsUpdatable = _.chain(data.mssVariantsInStitch)
        .filter(function(variant){
          return parseInt(variant.mss.QTY, 10) !== parseInt(variant.stitch.stock, 10)
        })
        .value()

      debug("number of total products in stitch: %d", data.Products.Products.length)
      debug("number of total variants in stitch: %d", data.Products.Variants.length)
      debug("number of variants missing sku in stitch: %d", data.stitchVariantsMissingSku.length)
      debug("number of duplicated skus in stitch: %d", data.stitchDuplicateSkus.length)
      debug("number of variants without unique sku in stitch: %d", data.stitchVariantsDuplicateSkus.length)
      debug("number of variants with unique sku in stitch : %d", data.stitchVariants.length) // data.stitchVariantsDuplicateSkus.length - data.stitchMissingSku.length
      debug("number of variants in mss: %d", data.FulfillmentInventory.length)
      debug("number of variants in mss that are found in stitch: %d", data.mssVariantsInStitch.length)
      debug("number of variants in mss not found in stitch: %d", data.mssVariantsMissingInStitch.length)
      debug("number of matched variants that need quantity updated: %d", data.mssVariantsUpdatable.length)

      return data

    })
}

module.exports = main
