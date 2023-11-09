  'use strict';

  //var config = require('./device.json');

  // require('ssl-root-cas').inject();
  // TODO try SNI loopback.example.com as result of api.ipify.com with loopback token

  function phoneHome() {
    var holepunch = require('./holepunch/beacon');
    var ports;

    ports = [
      { private: 65022
      , public: 65022
      , protocol: 'tcp'
      , ttl: 0
      , test: { service: 'ssh' }
      , testable: false
      }
    , { private: 650443
      , public: 650443
      , protocol: 'tcp'
      , ttl: 0
      , test: { service: 'https' }
      }
    , { private: 65080
      , public: 65080
      , protocol: 'tcp'
      , ttl: 0
      , test: { service: 'http' }
      }
    ];

    // TODO return a middleware
    holepunch.run(require('./redirects.json').reduce(function (all, redirect) {
      if (!all[redirect.from.hostname]) {
        all[redirect.from.hostname] = true;
        all.push(redirect.from.hostname);
      }
      if (!all[redirect.to.hostname]) {
        all[redirect.to.hostname] = true;
        all.push(redirect.to.hostname);
      }

      return all;
    }, []), ports).catch(function () {
      console.error("Couldn't phone home. Oh well");
    });
  }
