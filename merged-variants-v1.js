var debug = require("debug")("MergeVariants1")
var Promise = require("bluebird")
var _ = require("underscore")

function main(stitch, fulfillment){
  return Promise.props({
    "VariantCustomIds": stitch.requestAll("api2/v2/VariantCustomIds"),
    "Products": stitch.requestAll("api2/v2/Products"),
    "AccountAddresses": stitch.requestAll("api2/v2/AccountAddresses"),
    "FulfillmentInventory": fulfillment.inventory()
  })
    .then(function(data){
      // get the data for the fulfillment center
      data.mss = _.findWhere(data.AccountAddresses.AccountAddresses, {"company": "MSS Fulfillment"})
      // get the id of the custom type for sku
      data.sku = _.findWhere(data.VariantCustomIds.CustomIdTypes, {"name": "SKU"})
      // map products and variants together
      data.Products.Products = _.map(data.Products.Products, function(product){
        product.variants = _.map(product.links.Variants, function(variant){
          variant.sku = _.chain(data.VariantCustomIds.VariantCustomIds)
            .where({
              "sku_id": variant.id
            })
            .find(function(types){
              return types.links.CustomIdTypes[0].id == data.sku.id
            })
            .value()
          return variant
        })
        return product
      })

      data.stitchAllVariants = _.chain(data.Products.Products)
        .pluck("variants")
        .flatten()
        .value()

      data.stitchMissingSku = _.chain(data.stitchAllVariants)
        .filter(function(variant){
          // removes products with sku
          return !variant.sku
        })
        .value()

      data.stitchDuplicateSku = _.chain(data.stitchAllVariants)
        .filter(function(variant){
          // removes products without sku
          return variant.sku
        })
        .groupBy(function(variant){
          return variant.sku.value
        })
        .filter(function(variantsWithSku){
          return variantsWithSku.length > 1
        })
        .keys()
        .value()

      data.stitchVariantsDuplicateSkus = _.chain(data.stitchAllVariants)
        .filter(function(variant){
          // removes products without sku
          return variant.sku
        })
        .groupBy(function(variant){
          return variant.sku.value
        })
        .filter(function(variantsWithSku){
          return variantsWithSku.length > 1
        })
        .values()
        .flatten()
        .value()

      // flatten map of all valid variants & skus
      data.stitchVariants = _.chain(data.Products.Products)
        .map(function(product){
          // provide product_id within variant object
          product.variants = _.chain(product.variants)
            .filter(function(variant){
              // removes products without sku
              return variant.sku
            })
            .map(function(variant){
              return {
                "id": variant.id,
                "sku": variant.sku.value,
                "product_id": product.id
              }
            })
            .value()
          return product
        })
        .pluck("variants") // get all variants
        .flatten() // flatten the array
        .groupBy(function(variant){
          return variant.sku
        })
        .filter(function(variantsWithSku){
          // remove items where sku is shared
          return variantsWithSku.length == 1
        })
        .values()
        .flatten()
        .value()

      data.mssVariants = _.chain(data.FulfillmentInventory)
        .map(function(variant){
          var stitch = _.findWhere(data.stitchVariants, {
            "sku": variant.ITEM
          })
          variant.stitch = (stitch) ? stitch : false
          return variant
        })
        .filter(function(variant){
          return variant.stitch
        })
        .value()

      data.mssVariantsMissing = _.chain(data.FulfillmentInventory)
        .map(function(variant){
          var stitch = _.findWhere(data.stitchVariants, {
            "sku": variant.ITEM
          })
          variant.stitch = (stitch) ? stitch : false
          return variant
        })
        .filter(function(variant){
          return !variant.stitch
        })
        .value()

      debug("number of total products in stitch: %d", data.Products.Products.length)
      debug("number of total variants in stitch: %d", data.stitchAllVariants.length)
      debug("number of variants missing sku in stitch: %d", data.stitchMissingSku.length)
      debug("number of duplicated skus in stitch: %d", data.stitchDuplicateSku.length)
      debug("number of variants without unique sku in stitch: %d", data.stitchVariantsDuplicateSkus.length)
      debug("number of variants with unique sku in stitch : %d", data.stitchVariants.length) // data.stitchVariantsDuplicateSkus.length - data.stitchMissingSku.length
      debug("number of variants in mss: %d", data.FulfillmentInventory.length)
      debug("number of variants in mss that are found in stitch: %d", data.mssVariants.length)
      debug("number of variants in mss not found in stitch: %d", data.mssVariantsMissing.length)

      return data

    })
}

module.exports = main
