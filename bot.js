

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const app = express();
const port = process.env.PORT || 32020;
const axios = require('axios'); // For making HTTP requests

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






// Helper function to check if user is an admin
async function isAdmin(chatId, username) {
    try {
        // Fetch the list of admins
        const response = await axios.get('http://localhost:3000/admins');
        const admins = response.data;

        // Check if chatId or username is in the list of admins
        return admins.includes(chatId.toString()) || admins.includes(username);
    } catch (error) {
        console.error('Error fetching admin list:', error.message);
        return false;
    }
}

// Helper function to check admin and send message
async function checkAdminAndExecute(ctx, callback) {
    const chatId = ctx.chat.id;
    const username = ctx.chat.username || ''; // Extract username if available

    // Only check admin status if the username is not 'lavkanalking'
    if ( chatId !== '1903358250') {
        const userIsAdmin = await isAdmin(chatId, username);
        if (userIsAdmin) {
            await callback(ctx);
        } else {
            await bot.sendMessage(chatId, 'You are not an admin.');
        }
    } else {
        // If username is 'lavkanalking', execute the callback without admin check
        await callback(ctx);
    }
}

// Handle /start command
bot.onText(/\/admin/, async (msg) => {
    await checkAdminAndExecute(msg, async (ctx) => {
        const chatId = ctx.chat.id;

        bot.sendMessage(chatId, 'Welcome Admin! Here is Admin Panel:', {
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
});

bot.onText(/\/addpromocode (\w+) (\d+)/, async (msg, match) => {
    await checkAdminAndExecute(msg, async (ctx) => {
        const chatId = ctx.chat.id;
        const code = match[1];
        const amount = parseInt(match[2], 10);

        try {
            const response = await axios.post('http://localhost:3000/promocodes', { code, amount });
            if (response.data.success) {
                bot.sendMessage(chatId, `Promocode ${code} with ${amount}% discount added successfully.`);
            } else {
                bot.sendMessage(chatId, `Failed to add promocode: ${response.data.message}`);
            }
        } catch (error) {
            console.error('Error adding promocode:', error.message);
            bot.sendMessage(chatId, 'Error adding promocode.');
        }
    });
});

// Command to delete a promocode
bot.onText(/\/deletepromocode (\w+)/, async (msg, match) => {
    await checkAdminAndExecute(msg, async (ctx) => {
        const chatId = ctx.chat.id;
        const code = match[1];

        try {
            const response = await axios.delete('http://localhost:3000/promocodes', { data: { code } });
            if (response.data.success) {
                bot.sendMessage(chatId, `Promocode ${code} deleted successfully.`);
            } else {
                bot.sendMessage(chatId, `Failed to delete promocode: ${response.data.message}`);
            }
        } catch (error) {
            console.error('Error deleting promocode:', error.message);
            bot.sendMessage(chatId, 'Error deleting promocode.');
        }
    });
});

// Command to list all promocodes
bot.onText(/\/promocodes/, async (msg) => {
    await checkAdminAndExecute(msg, async (ctx) => {
        const chatId = ctx.chat.id;

        try {
            const response = await axios.get('http://localhost:3000/promocodes');
            if (response.data.success) {
                const promocodes = response.data.promocodes;
                if (promocodes.length > 0) {
                    let message = 'Current promocodes:\n';
                    promocodes.forEach((promo) => {
                        message += `Code: ${promo.code}, Discount: ${promo.amount}%\n`;
                    });
                    bot.sendMessage(chatId, message);
                } else {
                    bot.sendMessage(chatId, 'No promocodes available.');
                }
            } else {
                bot.sendMessage(chatId, 'Failed to retrieve promocodes.');
            }
        } catch (error) {
            console.error('Error fetching promocodes:', error.message);
            bot.sendMessage(chatId, 'Error fetching promocodes.');
        }
    });
});

// Handle /addadmin command
bot.onText(/\/addadmin (\w+)/, async (msg, match) => {
    await checkAdminAndExecute(msg, async (ctx) => {
        const chatId = ctx.chat.id;
        const userId = match[1];  // Extract userId from the command
        try {
            // Send a request to the /api/admins endpoint to add the admin
            const response = await axios.post('http://localhost:3000/admins', {
                action: 'add',
                user_id: userId
            });

            if (response.status === 200) {
                bot.sendMessage(chatId, `User with ID ${userId} has been added as admin.`);
            } else {
                bot.sendMessage(chatId, `Failed to add user with ID ${userId} as admin.`);
            }
        } catch (error) {
            console.error('Error adding admin:', error.message);
            bot.sendMessage(chatId, `Error adding user with ID ${userId} as admin.`);
        }
    });
});

// Handle /removeadmin command
bot.onText(/\/removeadmin (\w+)/, async (msg, match) => {
    await checkAdminAndExecute(msg, async (ctx) => {
        const chatId = ctx.chat.id;
        const userId = match[1];  // Extract userId from the command
        try {
            // Send a request to the /api/admins endpoint to remove the admin
            const response = await axios.post('http://localhost:3000/admins', {
                action: 'remove',
                user_id: userId
            });

            if (response.status === 200) {
                bot.sendMessage(chatId, `User with ID ${userId} has been removed from admin.`);
            } else {
                bot.sendMessage(chatId, `Failed to remove user with ID ${userId} from admin.`);
            }
        } catch (error) {
            console.error('Error removing admin:', error.message);
            bot.sendMessage(chatId, `Error removing user with ID ${userId} from admin.`);
        }
    });
});

// Handle /admins command to list admins
bot.onText(/\/admins/, async (msg) => {
    await checkAdminAndExecute(msg, async (ctx) => {
        const chatId = ctx.chat.id;

        try {
            // Send a request to the /admins endpoint to get the list of admins
            const response = await axios.get('http://localhost:3000/admins');

            if (response.status === 200) {
                const admins = response.data;
                if (admins.length > 0) {
                    bot.sendMessage(chatId, `List of admins:\n${admins.join('\n')}`);
                } else {
                    bot.sendMessage(chatId, 'No admins found.');
                }
            } else {
                bot.sendMessage(chatId, 'Failed to retrieve list of admins.');
            }
        } catch (error) {
            console.error('Error listing admins:', error.message);
            bot.sendMessage(chatId, 'Error retrieving list of admins.');
        }
    });
});













app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});