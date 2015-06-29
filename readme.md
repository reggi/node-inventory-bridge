# Node Stock Bridge

> Cron + [Marketing Support Solutions (MSS)](http://www.mssworks.com/order-fulfillment/) / [SPExpress (SPE)](http://www.spexpress.com/) + [Stitch Labs](http://www.stitchlabs.com/)  + Google Drive

This is a piece of software I made to automate some of the more manual tasks that take place behind the scenes at the Holstee office.

At Holstee we use Stitch Labs for inventory management, we use it as our middleman between our fulfillment center(s) and Shopify. One of our fulfillment centers MSS (recently acquired by SPE) doesn't talk to Stitch, so I built this software to bridge the gap. This is a script that runs on a daily basis. The script retrieves the daily `stock`, `quantity` or `inventory` numbers data from the SPE FTP server and pulling data from Stitch matching variants via SKU and updates the stock or quantity in Stitch with the updated one from MSS.  

## Modules Created

There are two modules created specifically for this project. One is the for the SPExpress API and the other for StitchLabs.

* [node-spexpress](https://github.com/reggi/node-spexpress)
* [node-stitchlabs](https://github.com/reggi/node-stitchlabs)

`npm i spexpress stitchlabs --save`

## The process

* Paginate over all products in Stitch
* Connect to the SPE FTP server and pull the latest inventory document
* Map over all the products in SPE and check Stitch
* Build a data report of all the products that are filtered out
* Return all variants that need their quantity updated
* Loop over all the variants and send quantity update requests
* Push the two reports as CSV's to Google Drive

## Environment Variables

The two defaults are `CRONTAB` which is set to `0 10 * * *`, which is everyday at 10am, and the timezone which is set to New York.

```
CRONTAB=0 10 * * *
TZ=America/New_York
STITCH_URL=
STITCH_CLIENT_ID=
STITCH_CLIENT_SECRET=
STITCH_ACCESS_TOKEN=
FTP_HOST=
FTP_USERNAME=
FTP_PASSWORD=
GD_WEB_CLIENT_ID=
GD_WEB_CLIENT_SECRET=
GD_WEB_REDIRECT_URI=
GD_USER_ACCESS_TOKEN=
GD_USER_TOKEN_TYPE=
GD_USER_REFRESH_TOKEN=
GD_USER_EXPIRY_DATE=
GD_FILE_UPLOAD_PARENT_ID=
```

## Google Drive Tokens

Go to Google Developer Console make a new web app, add those keys to the `.env` file.

```
GD_WEB_CLIENT_ID=
GD_WEB_CLIENT_SECRET=
GD_WEB_REDIRECT_URI=
```

Start up the google web server

```
npm run server
```

Open the webpage to login to google

```
open http://localhost:3000/google
```

This will create a `.token` file that you can copy and paste into `.env` and easily push to heroku with the following.

```
heroku config:push
```
