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

function askForMessage(user) {
  return new Promise((resolve) => {
    rl.question(`Enter ${user}'s message: `, (message) => {
      resolve({ user, message });
    });
  });
}

async function startChat() {
  while (true) {
    const senderMessage = await askForMessage('sender');
    const receiverMessage = await askForMessage('receiver');

    // Send the sender's message to the DHT using Hypercore
    const senderMessageString = JSON.stringify(senderMessage);
    core.append(senderMessageString + '\n', 'utf-8', () => {
      console.log(`${senderMessage.user}: ${senderMessage.message}`);
    });

    // Save the sender's message to the file
    fs.appendFileSync('chat-data.txt', `${senderMessage.user}: ${senderMessage.message}\n`);

    // Send the receiver's message to the DHT using Hypercore
    const receiverMessageString = JSON.stringify(receiverMessage);
    core.append(receiverMessageString + '\n', 'utf-8', () => {
      console.log(`${receiverMessage.user}: ${receiverMessage.message}`);
    });

    // Save the receiver's message to the file
    fs.appendFileSync('chat-data.txt', `${receiverMessage.user}: ${receiverMessage.message}\n`);
  }
}

startChat();

// Pipe stdin, DHT connection, and stdout
process.stdin.pipe(conn).pipe(process.stdout);