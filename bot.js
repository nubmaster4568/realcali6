

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const app = express();
const port = process.env.PORT || 32020;

const token = '6737002974:AAESnlUCyM6IbFQG7QBeHaJktARbx6DlP5g';
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
      console.log(chatId)
// Corrected variable name
  bot.sendMessage(chatId, 'SHOP', {

    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'SHOP',
            web_app: { url: `http://localhost:3000/?userId=${chatId}` }
          }
        ]
      ]
    }
  });
  
});
bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;
      console.log(chatId)
// Corrected variable name
  bot.sendMessage(chatId, 'SHOP', {

    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'SHOP',

            web_app: { url: `http://localhost:3000/admin/admin.html?userId=${chatId}` }
          }
        ]
      ]
    }
  });
  
});
app.get('/', (req, res) => {
    res.send('Telegram Bot is running');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});