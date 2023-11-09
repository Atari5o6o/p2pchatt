'use strict';

var upnp = require('../lib/upnp');
var opts = {
  debug: true
};
var ips = [];
var portInfo = {
  internal: 65080
, external: 65080
};

upnp(opts, ips, portInfo).then(function (result) {
  console.log('results', result);
}, function (err) {
  console.error('error', err.stack);
});
