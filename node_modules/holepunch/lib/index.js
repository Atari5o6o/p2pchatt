'use strict';

var PromiseA = require('bluebird');
var os = require('os');

module.exports = function (args) {
  if (args.debug) {
    console.log('[HP] create holepuncher');
    console.log(args);
  }

  var interfaces = os.networkInterfaces();
  var ifacenames = Object.keys(interfaces).filter(function (ifacename) {
    // http://www.freedesktop.org/wiki/Software/systemd/PredictableNetworkInterfaceNames/
    // https://wiki.archlinux.org/index.php/Network_configuration#Device_names
    // we do not include tun and bridge devices because we're trying
    // to see if any physical interface is internet-connected first
    return /^(en|sl|wl|ww|eth|net|lan|wifi|inet)/.test(ifacename);
  });

  function getExternalIps() {
    if (!args.ipifyUrls || !args.ipifyUrls.length) {
      return PromiseA.resolve(args.ifaces.map(function (iface) {
        return {
          family: iface.family
        //, address: addr
        , address: iface.address // TODO check where this is used
        , localAddress: iface.address
        };
      }));
    }

    return PromiseA.any(args.ipifyUrls.map(function (ipifyUrl) {
      var getIp = require('./external-ip');

      return getIp({ hostname: ipifyUrl, debug: args.debug });
    }));
  }

  function testOpenPort(ip, portInfo) {
    var requestAsync = require('./request');

    if (args.debug) {
      console.log('[HP] hostname', args.loopbackHostname);
    }

    return requestAsync({
      secure: portInfo.secure
    , rejectUnauthorized: false
    , hostname: ip.address
      // '/.well-known/com.daplie.loopback/'
    , path: args.loopbackPrefix + args.key
      // 'loopback.daplie.invalid'
    , servername: args.loopbackHostname
    , localAddress: ip.localAddress
    , port: portInfo.external || portInfo.internal
    , headers: {
        // 'loopback.daplie.invalid'
        Host: args.loopbackHostname
      }
    }).then(function (val) {
      if (args.debug) {
        console.log('[HP] loopback test reached', val);
      }

      if (val !== args.value) {
        return PromiseA.reject(new Error("invalid loopback token value"));
      }

      ip.validated = true;

      ip.ports.push(portInfo);
      portInfo.ips.push(ip);

      return portInfo;
    }, function (err) {
      if (args.debug) {
        console.log('[HP] loopback did not complete');
        console.log(err.stack);
      }

      return PromiseA.reject(err);
    });
  }

  function testPort(opts) {
    // TODO should ip.address === ip.localAddress be treated differently?
    // TODO check local firewall?
    // TODO would it ever make sense for a public ip to respond to upnp?

    // TODO should we pass any or require all?
    opts.portInfo.ips = [];

    return PromiseA.any(opts.ips.map(function (ip) {
      ip.ports = [];

      if (opts.debug) {
        console.log('[HP] pretest = ', opts.pretest);
      }

      if (!opts.pretest) {
        return PromiseA.reject(new Error("[not an error]: skip the loopback test"));
      }

      return testOpenPort(ip, opts.portInfo);
    }));
  }

  args.ifaces = ifacenames.reduce(function (all, ifacename) {
    var ifs = interfaces[ifacename];

    ifs.forEach(function (iface) {
      if (!iface.internal && !/^fe80/.test(iface.address)) {
        all.push(iface);
      }
    });

    return all;
  }, []);

  if (args.debug) {
    console.log('[HP] external ifaces:');
    console.log(args.ifaces);
  }

  return getExternalIps().then(function (ips) {
    var portInfos = args.mappings;

    return PromiseA.all(portInfos.map(function (mapping) {
      // TODO clone-merge args
      return testPort({
        portInfo: mapping
      , ips: ips
      , pretest: mapping.loopback
      });
    })).then(function (portInfos) {
      if (args.debug) {
        console.log('[HP] all done on the first try');
        console.log(portInfos);
      }
      return portInfos;
    }, function () {
      // at least one port could not be mapped
      var upnps = [];
      var pmps = [];
      var pu = PromiseA.resolve();
      var pm = PromiseA.resolve();

      if (args.upnp) {
        if (args.debug) {
          console.log('[HP] will try upnp');
        }
        upnps.push(require('./upnp'));
      }

      if (args.pmp) {
        if (args.debug) {
          console.log('[HP] will try nat-pmp');
        }
        pmps.push(require('./pmp'));
      }

      return PromiseA.all(portInfos.map(function (portInfo) {
        /*
        // TODO create single dgram listeners and serialize upnp requests
        // because we can't have multiple requests  bound to the same port, duh
        return PromiseA.any(mappers.map(function (fn) {
          var p = fn(args, ips, portInfo);

          if (portInfo.ips.length) {
            return portInfo;
          }

          return p;
        }));
        */
        var good;

        function nextu(fn) {
          pu = pu.then(function () {
            return fn(args, ips, portInfo);
          }).then(function (results) {
            good = results;
            return null;
          }, function (/*err*/) {
            return null;
          });
        }

        function nextm(fn) {
          pm = pm.then(function () {
            return fn(args, ips, portInfo);
          }).then(function (results) {
            good = results;
            return null;
          }, function (/*err*/) {
            return null;
          });
        }

        upnps.forEach(nextu);
        pmps.forEach(nextm);

        return PromiseA.any([pu, pm]).then(function () {
          if (!good) {
            return PromiseA.reject(new Error("no port map success"));
          }

          return null;
        });
      })).then(function () {
        if (args.debug) {
          console.log("[HP] all ports successfully mapped");
          console.log(portInfos);
        }

        return portInfos;
      });
    }).then(function () {
      return portInfos;
    }, function (err) {
      console.warn('[HP] RVPN not implemented');
      console.warn(err.stack);
      return portInfos;
    });
  });
};
