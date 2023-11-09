'use strict';

var http = require('http');
var https = require('https');
var express = require('express');

var middleware = module.exports.middleware = require('./middleware');

module.exports.create = function (opts) {
  var httpsOptions = opts.httpsOptions || require('localhost.daplie.com-certificates');
  var results = {
    plainServers: []
  , tlsServers: []
  };
  var app = express();

  app.use('/', middleware(opts));

  opts.mappings.forEach(function (mapping) {
    var server;

    if (false === mapping.secure) {
      server = http.createServer();
      server.__plainPort = mapping;
      server.on('request', app);
      results.plainServers.push(server);
    } else {
      server = https.createServer(httpsOptions);
      server.__tlsPort = mapping;
      server.on('request', app);
      results.tlsServers.push(server);
    }
  });

  function onListen() {
    /*jshint validthis: true*/
    var server = this;
    var addr = server.address();
    var proto = 'honorCipherOrder' in server ? 'https' : 'http';

    console.info('Listening on ' + proto + '://' + addr.address + ':' + addr.port);
  }

  process.nextTick(function () {
    results.plainServers.forEach(function (plainServer) {
      plainServer.on('error', function (err) {
        plainServer.error = err;
        console.warn("[HP loop] Error with plain HTTP server:");
        console.warn(err.stack);
      });
      try {
        plainServer.listen(
          plainServer.__plainPort.internal || plainServer.__plainPort.port
        , plainServer.__plainPort.address || '0.0.0.0'
        , onListen
        );
      } catch(e) {
        plainServer.error = e;
        console.warn("[HP loop] Could not create plain HTTP listener:");
        console.warn(e.stack);
      }
    });
    results.tlsServers.forEach(function (tlsServer) {
      tlsServer.on('error', function (err) {
        tlsServer.error = err;
        console.warn("[HP loop] Error with HTTPS server:");
        console.warn(err.stack);
      });
      try {
        tlsServer.listen(
          tlsServer.__tlsPort.internal || tlsServer.__tlsPort.port
        , tlsServer.__tlsPort.address || '0.0.0.0'
        , onListen
        );
      } catch(e) {
        tlsServer.error = e;
        console.warn("[HP loop] Could not create HTTPS listener:");
        console.warn(e.stack);
      }
    });
  });

  results.key = opts.key;
  results.value = opts.value;
  results.loopbackHostname = opts.loopbackHostname;
  results.loopbackPrefix = opts.loopbackPrefix;

  return results;
};
