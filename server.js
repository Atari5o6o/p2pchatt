const HyperDHT = require("hyperdht");
const b4a = require("b4a");
const dht = new HyperDHT();
//const { keypair } = require('./keygen.js');

//Public Key: dc1a0255c59d65d72c22fa823b8a18179d9cc0f18ec24a713a8466e956bf2eac
//Private Key: bcff9f37ad28bd9a2a59dbe146073097046fa40c39f11d89a42c3c8108bb623cdc1a0255c59d65d72c22fa823b8a18179d9cc0f18ec24a713a8466e956bf2eac

// Define a specific public key
const predefinedPublicKey = Buffer.from("dc1a0255c59d65d72c22fa823b8a18179d9cc0f18ec24a713a8466e956bf2eac", "hex");
const predefinedPrivateKey = Buffer.from("bcff9f37ad28bd9a2a59dbe146073097046fa40c39f11d89a42c3c8108bb623cdc1a0255c59d65d72c22fa823b8a18179d9cc0f18ec24a713a8466e956bf2eac", "hex");

// Create a key pair using the predefined public key
const keypair = {
  publicKey: predefinedPublicKey,
  secretKey: predefinedPrivateKey,
};


const server = dht.createServer(conn => {
  console.log('got connection!')
  process.stdin.pipe(conn).pipe(process.stdout)
});

// Use the predefined public key for server.listen
server.listen(keypair).then(() => {
  console.log('listening on:', b4a.toString(keypair.publicKey, 'hex'));
});


