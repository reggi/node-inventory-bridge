// takes in data from `merged-variants`
// data.mssVariantsMissing is a collection of variant objects
// each variant object contains both `stitch` and `mss` objects
// updates stock in stitich with `variant.mss.QTY`

var Promise = require("bluebird")

function main(stitch, data){
  return Promise.map(data.update, function(variant){
    return stitch.makeRequest({
      "return_options": false,
      "url": "api2/v1/Variants/detail",
      "body":{
        "action":"write",
        "Variants":[
          {
            "id": variant.stitch.id,
            "links":{
              "ReconcileInventory":[
                {
                  "change":"set_available",
                  "units": variant.mss.QTY,
                  "links":{
                    "AccountAddresses":[
                      {
                        "id": data.mss.id
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    }).then(function(response){
      variant.response = response
      return variant
    }).catch(function(e){
      variant.response = function(){
        if(e.body && e.body.message) return e.body.message
        return e.message
      }()
      return variant
    })
  })
}

module.exports = main
