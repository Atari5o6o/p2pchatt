const HyperDHT = require('hyperdht');
const hypercore = require('hypercore');
const readline = require('readline');

const dht = new HyperDHT();
const core = new hypercore('./my-chat-feed', { valueEncoding: 'utf-8' });

dht.on('ready', () => {
  dht.join(); // Join the DHT network
  console.log('DHT is ready.');
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter your name: ', (name) => {
  console.log(`Welcome, ${name}! You can start chatting.`);

  rl.on('line', (message) => {
    // Send the message to the DHT using Hypercore
    const messageObj = { user: name, message };
    const messageString = JSON.stringify(messageObj);
    core.append(messageString, () => {
      console.log(`You: ${message}`);
    });
  });
});

//incoming messages
core.createReadStream({ live: true }).on('data', (data) => {
  const { user, message } = JSON.parse(data.toString());
  console.log(`${user}: ${message}`);
});

dht.on('peer', (peer) => {
  // Establish a P2P connection with the peer (if needed)
});

process.on('SIGINT', () => {
  dht.destroy();
  core.close();
  rl.close();
  console.log('Disconnected. Exiting...');
  process.exit(0);
});

