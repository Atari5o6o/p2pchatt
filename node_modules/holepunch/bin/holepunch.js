#!/usr/bin/env node
'use strict';

var cli = require('cli');
//var mkdirp = require('mkdirp');

// TODO link with RVPN service: server, email, domains, agree-tos
// TODO txt records for browser plugin: TXT _http.example.com _https.example.com
cli.parse({
  debug: [ false, " show traces and logs", 'boolean', false ]
, 'plain-ports': [ false, " Port numbers to test with plaintext loopback. (default: 65080) (formats: <port>,<internal:external>)", 'string' ]
//, 'plain-ports': [ false, " Port numbers to test with plaintext loopback. (default: 65080) (formats: <port>,<internal:external>,<internal:external1|external2>)", 'string' ]
, 'tls-ports': [ false, " Port numbers to test with tls loopback. (default: null)", 'string' ]
, 'ipify-urls': [ false, " Comma separated list of URLs to test for external ip. (default: api.ipify.org)", 'string' ]
, protocols: [ false, " Comma separated list of ip mapping protocols. (default: none,upnp,pmp)", 'string' ]
//, upnp: [ false, " Use nat-upnp. (default: true)", 'boolean' ]
//, pmp: [ false, " Use nat-pmp. (default: true)", 'boolean' ]
, 'rvpn-configs': [ false, " Comma separated list of Reverse VPN config files in the order they should be tried. (default: null)", 'string' ]
// TODO allow standalone, webroot, etc
});

// ignore certonly and extraneous arguments
cli.main(function(_, options) {
  console.log('');
  var args = {};
  var hp = require('../');
  var loopback = require('../lib/loopback-listener');
  var plainPorts = options['plain-ports'];
  var tlsPorts = options['tls-ports'];
  var pretest;
  var protocols;

  function parsePorts(portstr) {
    var parts = portstr.split(':');
    var opts = {
      internal: parseInt(parts[0], 10)
    , external: (parts[1]||parts[0]).split('|').map(function (port) {
        return parseInt(port, 10);
      })[0]
    };

    return opts;
  }

  function exists(x) {
    return x;
  }

  if (options.debug) {
    console.log('[HP CLI] options');
    console.log(options);
  }

  args.debug = options.debug;
  protocols = options.protocols;
  args.ipifyUrls = options['ipify-urls'];
  args.rvpnConfigs = options['rvpn-configs'];

  if ('false' === args.ipifyUrls || false === args.ipifyUrls) {
    args.ipifyUrls = [];
  } else {
    args.ipifyUrls = (args.ipifyUrls || 'api.ipify.org').split(',');
  }
  if ('false' === protocols || false === protocols) {
    protocols = [];
  } else {
    protocols = (protocols || 'none,upnp,pmp').split(',');
  }
  // Coerce to string. cli returns a number although we request a string.
  tlsPorts = (tlsPorts || "").toString().split(',').filter(exists).map(parsePorts);
  args.rvpnConfigs = (args.rvpnConfigs || "").toString().split(',').filter(exists);
  if ('false' === plainPorts || false === plainPorts) {
    plainPorts = [];
  } else {
    plainPorts = (plainPorts || "65080").toString().split(',').map(parsePorts);
  }
  pretest = (-1 !== protocols.indexOf('none'));
  args.upnp = options.upnp
    || (-1 !== protocols.indexOf('upnp')) || (-1 !== protocols.indexOf('ssdp'));
  args.pmp = options.pmp
    || (-1 !== protocols.indexOf('pmp')) || (-1 !== protocols.indexOf('nat-pmp'));

  args.mappings = plainPorts.map(function (info) {
    info.secure = false;
    info.loopback = pretest;
    return info;
  }).concat(tlsPorts.map(function (info) {
    info.secure = true;
    info.loopback = pretest;
    return info;
  }));

  //var servers = loopback.create(args);
  loopback.create(args);

  if (args.debug) {
    console.log('[HP] create servers');
    //console.log(servers);
  }

  return hp(args).then(function () {
    //console.log('[HP] wishing wanting waiting');
    console.log('complete, exiting');
    process.exit(0);
  });
});
