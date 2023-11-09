'use strict';

var PromiseA = require('bluebird');
//var dns = PromiseA.promisifyAll(require('dns'));
var requestAsync = require('./request');

module.exports = function (opts) {
  var promises = [];

  /*
  // TODO how to support servername
  promises.push(dns.resolve4Async(hostname).then(function (ips) {
    return ips.map(function (ip) {
      return {
        address: ip
      , family: 'IPv4'
      };
    });
  }));

  promises.push(dns.resolve6Async(hostname).then(function (ips) {
    return ips.map(function (ip) {
      return {
        address: ip
      , family: 'IPv6'
      };
    });
  }));
  */

  function parseIp(ip) {
    if (!/\d+\.\d+\.\d+\.\d+/.test(ip) && !/\w+\:\w+/.test(ip)) {
      return PromiseA.reject(new Error("bad response '" + ip + "'"));
    }

    return ip;
  }

  function ignoreEinval(err) {
    if ('EINVAL' === err.code) {
      if (opts.debug) {
        console.warn('[HP] tried to bind to invalid address:');
        console.warn(err.stack);
      }
      return null;
    }

    return PromiseA.reject(err);
  }

  if (opts.debug) {
    console.log('[HP] external ip opts:');
    console.log(opts);
  }

  opts.ifaces.forEach(function (iface) {
    promises.push(requestAsync({
      family: iface.family
    , method: 'GET'
    , headers: {
        Host: opts.hostname
      }
    , localAddress: iface.address
    , servername: opts.hostname   // is this actually sent to tls.connect()?
    , hostname: opts.hostname     // if so we could do the DNS ourselves
                                  // and use the ip address here
    , port: opts.port || 443
    , pathname: opts.pathname || opts.path || '/'
    }).then(parseIp, ignoreEinval).then(function (addr) {
      return {
        family: iface.family
      , address: addr
      , localAddress: iface.address
      };
    }));
  });

  return PromiseA.all(promises).then(function (results) {
    if (opts.debug) {
      console.log('[HP] got all ip address types');
      console.log(results);
    }

    return results;
  }, function (err) {
    console.error('[HP] error');
    console.error(err);
  });
};
