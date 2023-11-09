const HyperDHT = require("hyperdht");
const b4a = require("b4a")
const dht = new HyperDHT();
const keypair = dht.defaultKeyPair
console.log(keypair)


const server = dht.createServer(conn => {
  console.log('got connection!')
  process.stdin.pipe(conn).pipe(process.stdout)
})

server.listen(keypair).then(() => {
  console.log('listening on:', b4a.toString(keypair.publicKey, 'hex'))
})



