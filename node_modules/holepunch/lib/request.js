'use strict';

var PromiseA = require('bluebird');
var https = PromiseA.promisifyAll(require('https'));
var http = PromiseA.promisifyAll(require('http'));

function requestAsync(opts) {
  return new PromiseA(function (resolve, reject) {
    var httpr = (false === opts.secure) ? http : https;

    if (opts.debug) {
      console.log('[HP] requestAsync opts');
      console.log(opts);
    }

    var req = httpr.request(opts, function (res) {
      var data = '';

      res.on('error', function (err) {
        if (opts.debug) {
          console.error('[Error] HP: bad request:');
          console.error(err);
        }
        reject(err);
      });
      res.on('data', function (chunk) {
        clearTimeout(req.__timtok);

        if (opts.debug > 2) {
          console.log('HP: request chunk:');
          console.log(chunk);
        }

        data += chunk.toString('utf8');
      });
      res.on('end', function () {
        if (opts.debug > 2) {
          console.log('HP: request complete:');
          console.log(data);
        }
        resolve(data);
      });
    });

    req.on('error', reject);
    req.setTimeout(3 * 1000);
    req.on('socket', function (socket) {
      req.__timtok = setTimeout(function () {
        req.abort();
      }, 3 * 1000);
      socket.setTimeout(3 * 1000);
    });
    req.end();
  });
}

module.exports = requestAsync;
