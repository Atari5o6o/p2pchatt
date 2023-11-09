const HyperDHT = require("hyperdht");
const b4a = require("b4a")
const hypercore = require('hypercore');
const readline = require('readline');

console.log('Connecting to:', process.argv[2])
const publicKey = b4a.from(process.argv[2], 'hex')

const core = new hypercore('./my-chat-feed', { valueEncoding: 'utf-8' });

const dht = new HyperDHT()
const conn = dht.connect(publicKey)
conn.once('open', () => console.log('got connection!'))

//incoming messages
core.createReadStream({ live: true }).on('data', (data) => {
    const { user, message } = JSON.parse(data.toString());
    console.log(`${user}: ${message}`);
  });

process.stdin.pipe(conn).pipe(process.stdout)