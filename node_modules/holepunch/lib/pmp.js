'use strict';

var PromiseA = require('bluebird');
var natpmp = require('holepunch-nat-pmp');

function getGateway() {
  var exec = require('child_process').exec;
  var netroute;
  var gw;

  try {
    netroute = require('netroute');
    gw = netroute.getGateway();
  } catch(e) {
  }

  if (gw) {
    return PromiseA.resolve(gw);
  }

  return new PromiseA(function (resolve, reject) {
    exec('ip route show default', function (err, stdout, stderr) {
      var gw;

      if (err || stderr) { reject(err || stderr); return; }

      // default via 192.168.1.1 dev eth0
      gw = stdout.replace(/^default via (\d+\.\d+\.\d+\.\d+) dev[\s\S]+/m, '$1');
      console.log('Possible PMP gateway is', gw);

      return gw;
    });
  });
}

function pmpForwardHelper(gw, portInfo) {
  return new PromiseA(function (resolve, reject) {
    // create a "client" instance connecting to your local gateway
    var client = natpmp.connect(gw);
    client.on('error', function (err) {
      reject(err);
    });

    function setPortForward() {
      // setup a new port mapping
      client.portMapping({
        private: portInfo.internal || portInfo.private
          || portInfo.external || portInfo.public
      , public: portInfo.external || portInfo.public
          || portInfo.internal || portInfo.private
      , ttl: portInfo.ttl || 7200 // 0 // 600
      }, function (err, info) {
        if (err) {
          reject(err);
          return;
        }

        console.log(info);
        // {
        //   type: 'tcp',
        //   epoch: 8922109,
        //   private: 22,
        //   public: 2222,
        //   ...
        // }

        client.close();
        resolve();
      });
    }

    // explicitly ask for the current external IP address
    // TODO why did I use a setTimeout here? event loop / timing bug?
    setTimeout(function () {
      client.externalIp(function (err, info) {
        if (err) {
          console.error('[HP] Error: setTimeout client.externalIp:');
          console.error(err.stack);
          return PromiseA.reject(err);
        }
        console.log('Current external IP address: %s', info.ip.join('.'));
        setPortForward();
      });
    });
  });
}

function pmpForward(portInfo) {
  return getGateway().then(function (gw) {
    return pmpForwardHelper(gw, portInfo);
  });
}

module.exports = function (args, ips, portInfo) {
  if (args.debug) {
    console.log('[HP] [pmp] portInfo');
    console.log(portInfo);
  }
  return pmpForward(portInfo);
};

module.exports.pmpForward = pmpForward;

/*
function usage() {
  console.warn("");
  console.warn("node helpers/pmp-forward [public port] [private port] [ttl]");
  console.warn("");
}

function run() {
  var pubPort = parseInt(process.argv[2], 10) || 0;
  var privPort = parseInt(process.argv[3], 10) || pubPort;
  var ttl = parseInt(process.argv[4], 10) || 0;
  var options = { public: pubPort, private: privPort, ttl: ttl };

  if (!pubPort) {
    usage();
    return;
  }

  exports.pmpForward(options).then(function () {
    console.log('done');
  });
}

if (require.main === module) {
  run();
}
*/
