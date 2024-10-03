const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { NlpManager } = require('node-nlp');

// Use your actual Telegram bot token
const token = '7241073853:AAFp5vNCxC9B-Gu7x6h-LeQP_ZvNcxtdgbs';
const bot = new TelegramBot(token, { polling: true });

// Initialize NLP Manager
const manager = new NlpManager({ languages: ['en'] });

// Add training data to the NLP manager
manager.addDocument('en', 'hello', 'greetings.hello');
manager.addDocument('en', 'hi', 'greetings.hello');
manager.addDocument('en', 'goodbye', 'greetings.bye');
manager.addDocument('en', 'bye', 'greetings.bye');
manager.addDocument('en', 'forward this image', 'action.forward');
manager.addDocument('en', 'send this photo to the group', 'action.forward');
manager.addDocument('en', 'show buttons', 'command.buttons');

// Add responses for the intents
manager.addAnswer('en', 'greetings.hello', 'Hello! How can I help you today?');
manager.addAnswer('en', 'greetings.bye', 'Goodbye! Have a great day!');
manager.addAnswer('en', 'command.buttons', 'Sure! Let me show you some buttons.');

// Train the NLP model
(async () => {
  await manager.train();
  manager.save();
})();

// Command Processor
const commandHandlers = {
  '/buttons': (msg) => {
    const buttons = {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            { text: 'X', callback_data: 'cancel' },
            { text: '⬅️ Back', callback_data: 'back' },
            { text: '➡️ Forward', callback_data: 'forward' }
          ],
          [
            { text: '0', callback_data: '0' },
            { text: '1', callback_data: '1' },
            { text: '2', callback_data: '2' },
            { text: '3', callback_data: '3' },
            { text: '4', callback_data: '4' }
          ],
          [
            { text: '5', callback_data: '5' },
            { text: '6', callback_data: '6' },
            { text: '7', callback_data: '7' },
            { text: '8', callback_data: '8' },
            { text: '9', callback_data: '9' }
          ],
          [{ text: '10', callback_data: '10' }]
        ]
      })
    };
    bot.sendMessage(msg.chat.id, 'Choose a number or an action:', buttons);
  }
};

// Handle messages
bot.on('message', async (msg) => {
  if (msg.from.is_bot) return;

  console.log('Received a message:', msg);
  if (msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const chatId = msg.chat.id;

    // Redirect to another group
    const targetGroupId = -4206702305;

    try {
      await bot.sendPhoto(targetGroupId, fileId, { caption: `Forwarded from ${chatId}` });
      bot.sendMessage(chatId, 'Your image has been forwarded to the group.');
    } catch (error) {
      console.error('Error forwarding image:', error);
      bot.sendMessage(chatId, 'Failed to forward the image.');
    }
  } else if (msg.text) {
    const response = await manager.process('en', msg.text.trim());
    console.log('NLP response:', response);

    if (response.intent === 'greetings.hello' || response.intent === 'greetings.bye') {
      bot.sendMessage(msg.chat.id, response.answer);
    } else if (response.intent === 'command.buttons') {
      commandHandlers['/buttons'](msg);
    } else {
      bot.sendMessage(msg.chat.id, `I didn't understand that. Try typing "hello" or "show buttons".`);
    }
  } else {
    console.error('Received message without text:', msg);
  }
});

// Handle button clicks
bot.on('callback_query', (callbackQuery) => {
  const message = callbackQuery.message;
  const data = callbackQuery.data;

  switch (data) {
    case 'cancel':
      bot.sendMessage(message.chat.id, 'You have canceled the selection.');
      break;
    case 'back':
      bot.sendMessage(message.chat.id, 'You clicked Back.'); // You can implement back navigation if needed
      break;
    case 'forward':
      bot.sendMessage(message.chat.id, 'You clicked Forward.'); // You can implement forward navigation if needed
      break;
    case 'select':
      bot.sendMessage(message.chat.id, `You selected a number. Please click one of the number buttons.`);
      break;
    default:
      // Notify the user of their selection and remove the buttons
      bot.sendMessage(message.chat.id, `You selected button: ${data}`);
      bot.sendMessage(message.chat.id, 'Please click /buttons to show options again.');
      break;
  }

  // Acknowledge the callback
  bot.answerCallbackQuery(callbackQuery.id);
});

// Handle polling errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Express server setup
const app = express();
app.use(bodyParser.json());

app.get('/updates', async (req, res) => {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching updates:', error);
    res.status(500).send('Error fetching updates');
  }
});

app.post('/send', (req, res) => {
  const { chatId, message } = req.body;
  bot.sendMessage(chatId, message)
    .then(() => res.status(200).send('Message sent'))
    .catch(err => {
      console.error('Error sending message:', err);
      res.status(500).send('Error sending message');
    });
});

app.put('/webhook', async (req, res) => {
  const { url } = req.body;
  try {
    const response = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, { url });
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error setting webhook:', error);
    res.status(500).send('Error setting webhook');
  }
});

app.delete('/webhook', async (req, res) => {
  try {
    const response = await axios.post(`https://api.telegram.org/bot${token}/deleteWebhook`);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).send('Error deleting webhook');
  }
});

// Start the HTTP server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
