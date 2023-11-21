const HyperDHT = require("hyperdht");
const dht = new HyperDHT();


// Generate a new key pair
const keypair = dht.defaultKeyPair;
console.log("Public Key:", keypair.publicKey.toString("hex"));
console.log("Private Key:", keypair.secretKey.toString("hex"));
