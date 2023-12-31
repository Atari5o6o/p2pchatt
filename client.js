const HyperDHT = require("hyperdht");
const b4a = require("b4a")
const hypercore = require('hypercore');
const readline = require('readline');
const fs = require('fs');

console.log('Connecting to:', process.argv[2])
const publicKey = b4a.from(process.argv[2], 'hex')

const core = new hypercore('./my-chat-feed', { valueEncoding: 'utf-8' });

const dht = new HyperDHT()
const conn = dht.connect(publicKey)
conn.once('open', () => console.log('got connection!'))

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter your name: ', (name) => {
  console.log(`Welcome, ${name}! You can start chatting.`);

  // Create a writable stream for the Hypercore feed
  const feed = core.createWriteStream();

  // Create a readable stream for the Hypercore feed
  const readStream = core.createReadStream({ live: true });

  // Create a writable stream for saving messages to a file
  const fileStream = fs.createWriteStream('chat-data.txt', { flags: 'a' });

  const sendMessage = (user, message) => {
    // Send the message to the DHT using Hypercore
    const messageObj = { user, message };
    const messageString = JSON.stringify(messageObj);

    // Append the message to the Hypercore feed
    feed.write(messageString + '\n', 'utf-8', () => {
      console.log(`${user}: ${message}`);
    });

    // Append the message to the file
    fileStream.write(`${user}: ${message}\n`);
  };

  rl.on('line', async (message) => {
    // Sender's message
    sendMessage(name, message);

    // Receiver's message
    const receiverMessage = await askForMessage('receiver');
    sendMessage(receiverMessage.user, receiverMessage.message);
  });

  // Incoming messages
  readStream.on('data', (data) => {
    const { user, message } = JSON.parse(data.toString());
    console.log(`${user}: ${message}\n`);

    // Append the received message to the file
    fileStream.write(`${user}: ${message}\n`);
  });
});

// Pipe stdin, DHT connection, and stdout
process.stdin.pipe(conn).pipe(process.stdout);

function askForMessage(user) {
  return new Promise((resolve) => {
    rl.question(`Enter ${user}'s message: `, (message) => {
      resolve({ user, message });
    });
  });
}