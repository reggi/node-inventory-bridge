var debug = require("debug")("Cron")
var mergeUpdateReport = require("./merge-update-report")
var CronJob = require('cron').CronJob;

debug("starting index.js / cron process")

new CronJob({
  cronTime: process.env.CRONTAB,
  onTick: function() {
    debug("running merge-update-report.js")
    mergeUpdateReport()
  },
  start: true,
  timeZone: process.env.TZ
});
