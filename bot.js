const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// Use your actual Telegram bot token
const token = '7241073853:AAFp5vNCxC9B-Gu7x6h-LeQP_ZvNcxtdgbs';
const bot = new TelegramBot(token, { polling: true });

// User profile storage
const userProfiles = {};

// Command Processor
const commandHandlers = {
  '/echo': (msg, args) => {
    const response = `Received a request for echo: ${args}`;
    bot.sendMessage(msg.chat.id, response);
  },
  '/greet': (msg, args) => {
    const response = `Hello ${args}, how are you doing?`;
    bot.sendMessage(msg.chat.id, response);
  },
  '/profile': (msg) => {
    const userProfile = userProfiles[msg.from.id] || {};
    const response = `Your profile:\nName: ${userProfile.name || 'Not set'}`;
    bot.sendMessage(msg.chat.id, response);
  },
  '/bye': (msg) => {
    const response = 'Goodbye! Have a great day!';
    bot.sendMessage(msg.chat.id, response);
  },
  '/andyou': (msg) => {
    const response = `I'm just a bot, but I'm here to help you!`;
    bot.sendMessage(msg.chat.id, response);
  },
  '/wassup': (msg) => {
    const response = `Not much, just here to help! What's up with you?`;
    bot.sendMessage(msg.chat.id, response);
  },
};

// Handle messages
bot.on('message', async (msg) => {
  if (msg.from.is_bot) return;

  console.log('Received a message:', msg);
 if (msg.photo) 
{
    // Handle photo message
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const chatId = msg.chat.id;

    // Redirect to another group
    const targetGroupId = -4206702305; 

    try
    {
      await bot.sendPhoto(targetGroupId, fileId, { caption: `Forwarded from ${chatId}` });
      bot.sendMessage(chatId, 'Your image has been forwarded to the group.');
    } 
    catch (error)
     {
        console.error('Error forwarding image:', error);
        bot.sendMessage(chatId, 'Failed to forward the image.');
    }
  } 
  else if (msg.text)  
    {
    const text = msg.text.trim();
    const [command, ...args] = text.split(' ');
    const argsStr = args.join(' ');

    console.log('Parsed command:', command);
    console.log('Parsed arguments:', argsStr);

    if (command in commandHandlers)
   {
      // Handle specific commands
      console.log('Handling command:', command);
      commandHandlers[command](msg, argsStr);
    }
     else if (text.startsWith('my name is '))
     {
      // Process user name
      const name = text.replace('my name is ', '');
      userProfiles[msg.from.id] = { name };
      bot.sendMessage(msg.chat.id, `Nice to meet you, ${name}!`);
    } else
    {
      // Default response for unrecognized commands
      bot.sendMessage(msg.chat.id, `I didn't understand: ${text}`);
    }
  }
   else
   {
    console.error('Received message without text:', msg);
  }
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

console.log('Bot is running...');












