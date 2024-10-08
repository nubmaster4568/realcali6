const tus = require('tus-js-client');

const express = require('express');
const formidable = require('formidable');
const { Pool } = require('pg'); // Import pg for PostgreSQL
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = 3000;
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const sharp = require('sharp');
const { exec } = require('child_process');

// Replace 'YOUR_BOT_TOKEN_HERE' with your actual bot token from BotFather
const bot = new Telegraf('6737002974:AAESnlUCyM6IbFQG7QBeHaJktARbx6DlP5g');
const botToken = '6737002974:AAESnlUCyM6IbFQG7QBeHaJktARbx6DlP5g'
// Create a new instance of the TelegramBot class
// PostgreSQL connection


bot.start((ctx) => {
  const chatId = ctx.chat.id;
  console.log(chatId);
  ctx.reply('SHOP', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'SHOP',
            web_app: { url: `https://realcalidirect.com/?userId=${chatId}` }
          }
        ]
      ]
    }
  });
});

// Helper function to check if user is an admin
async function isAdmin(chatId, username) {
  try {
    const response = await axios.get('https://www.realcalidirect.com/admins');
    const admins = response.data;
    console.log(admins);
    return admins.includes(chatId.toString()) || admins.includes(username);
  } catch (error) {
    console.error('Error fetching admin list:', error.message);
    return false;
  }
}

// Helper function to check admin and execute callback
async function checkAdminAndExecute(ctx, callback) {
  const chatId = ctx.chat.id;
  const username = ctx.chat.username || '';
  console.log(chatId, username);
  if (chatId !== 1903358250) {
    const userIsAdmin = await isAdmin(chatId, username);
    if (userIsAdmin) {
      await callback(ctx);
    } else {
      await ctx.reply('You are not an admin.');
    }
  } else {
    await callback(ctx);
  }
}
bot.command('discount', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1); // Get the command arguments
    const discountValue = parseFloat(args[0]); // Parse the discount value
  
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 1) {
      ctx.reply('Please provide a valid discount value between 0 and 1 (e.g., /discount 0.80).');
      return;
    }
  
    await checkAdminAndExecute(ctx, async (ctx) => {
      try {
        // Call your server to save the discount
        const response = await axios.post('https://www.realcalidirect.com/api/discount', {
          discount: discountValue,
        });
  
        // Respond to the user based on the server response
        if (response.status === 200) {
          ctx.reply(`Discount of ${Math.round((1 - discountValue) * 100)}% saved successfully!`);
        } else {
          ctx.reply('Failed to save the discount. Please try again.');
        }
      } catch (error) {
        console.error('Error saving discount:', error);
        ctx.reply('An error occurred while saving the discount. Please try again later.');
      }
    });
  });
// Handle /admin command
bot.command('admin', async (ctx) => {
  await checkAdminAndExecute(ctx, async (ctx) => {
    const chatId = ctx.chat.id;
    ctx.reply('Welcome Admin! Here is Admin Panel:', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'SHOP',
              web_app: { url: `https://www.realcalidirect.com/admin/admin.html?userId=${chatId}` }
            }
          ]
        ]
      }
    });
  });
});

// Handle /addpromocode command
bot.command('addpromocode', async (ctx) => {
  const match = ctx.message.text.match(/\/addpromocode (\w+) (\d+)/);
  if (match) {
    await checkAdminAndExecute(ctx, async (ctx) => {
      const code = match[1];
      const amount = parseInt(match[2], 10);

      try {
        const response = await axios.post('https://www.realcalidirect.com/promocodes', { code, amount });
        if (response.data.success) {
          ctx.reply(`Promocode ${code} with ${amount}% discount added successfully.`);
        } else {
          ctx.reply(`Failed to add promocode: ${response.data.message}`);
        }
      } catch (error) {
        console.error('Error adding promocode:', error.message);
        ctx.reply('Error adding promocode.');
      }
    });
  }
});

// Handle /deletepromocode command
bot.command('deletepromocode', async (ctx) => {
  const match = ctx.message.text.match(/\/deletepromocode (\w+)/);
  if (match) {
    await checkAdminAndExecute(ctx, async (ctx) => {
      const code = match[1];

      try {
        const response = await axios.delete('https://www.realcalidirect.com/promocodes', { data: { code } });
        if (response.data.success) {
          ctx.reply(`Promocode ${code} deleted successfully.`);
        } else {
          ctx.reply(`Failed to delete promocode: ${response.data.message}`);
        }
      } catch (error) {
        console.error('Error deleting promocode:', error.message);
        ctx.reply('Error deleting promocode.');
      }
    });
  }
});

// Handle /promocodes command to list all promocodes
bot.command('promocodes', async (ctx) => {
  await checkAdminAndExecute(ctx, async (ctx) => {
    try {
      const response = await axios.get('https://www.realcalidirect.com/promocodes');
      if (response.data.success) {
        const promocodes = response.data.promocodes;
        if (promocodes.length > 0) {
          let message = 'Current promocodes:\n';
          promocodes.forEach((promo) => {
            message += `Code: ${promo.code}, Discount: ${promo.amount}%\n`;
          });
          ctx.reply(message);
        } else {
          ctx.reply('No promocodes available.');
        }
      } else {
        ctx.reply('Failed to retrieve promocodes.');
      }
    } catch (error) {
      console.error('Error fetching promocodes:', error.message);
      ctx.reply('Error fetching promocodes.');
    }
  });
});

// Handle /addadmin command
bot.command('addadmin', async (ctx) => {
  const match = ctx.message.text.match(/\/addadmin (\w+)/);
  if (match) {
    await checkAdminAndExecute(ctx, async (ctx) => {
      const userId = match[1];
      try {
        const response = await axios.post('https://www.realcalidirect.com/admins', {
          action: 'add',
          user_id: userId
        });

        if (response.status === 200) {
          ctx.reply(`User with ID ${userId} has been added as admin.`);
        } else {
          ctx.reply(`Failed to add user with ID ${userId} as admin.`);
        }
      } catch (error) {
        console.error('Error adding admin:', error.message);
        ctx.reply(`Error adding user with ID ${userId} as admin.`);
      }
    });
  }
});

// Handle /removeadmin command
bot.command('removeadmin', async (ctx) => {
  const match = ctx.message.text.match(/\/removeadmin (\w+)/);
  if (match) {
    await checkAdminAndExecute(ctx, async (ctx) => {
      const userId = match[1];
      try {
        const response = await axios.post('https://www.realcalidirect.com/admins', {
          action: 'remove',
          user_id: userId
        });

        if (response.status === 200) {
          ctx.reply(`User with ID ${userId} has been removed from admin.`);
        } else {
          ctx.reply(`Failed to remove user with ID ${userId} from admin.`);
        }
      } catch (error) {
        console.error('Error removing admin:', error.message);
        ctx.reply(`Error removing user with ID ${userId} from admin.`);
      }
    });
  }
});

// Handle /admins command to list admins
bot.command('admins', async (ctx) => {
  await checkAdminAndExecute(ctx, async (ctx) => {
    try {
      const response = await axios.get('https://www.realcalidirect.com/admins');

      if (response.status === 200) {
        const admins = response.data;
        if (admins.length > 0) {
          ctx.reply(`List of admins:\n${admins.join('\n')}`);
        } else {
          ctx.reply('No admins found.');
        }
      } else {
        ctx.reply('Failed to retrieve list of admins.');
      }
    } catch (error) {
      console.error('Error listing admins:', error.message);
      ctx.reply('Error retrieving list of admins.');
    }
  });
});



bot.launch();



const client = new Pool({
    connectionString: 'postgres://realcali:2IiXdAejkdp5WWBnTWI0qIK52VxU2hR8@dpg-cr6vpk23esus73947js0-a.oregon-postgres.render.com/realcali',
    ssl: { rejectUnauthorized: false }
});
client.connect();

// Middleware to handle CORS
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('./'));

// Ensure the tables exist
client.query(`
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    tx_id TEXT,
    amount REAL,
    user_id TEXT,  -- Changed from 'user'
    wallet_address TEXT
);

`, (err) => {
    if (err) {
        console.error('Error creating transactions table:', err.message);
    }
});
// Ensure the admin_users table exists
client.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
        user_id TEXT PRIMARY KEY
    )
`, (err) => {
    if (err) {
        console.error('Error creating admin_users table:', err.message);
    }
});

client.query(`
    CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        longitude REAL,
        latitude REAL,
        weight REAL,
        price REAL,
        name TEXT,
        type TEXT,
        identifier TEXT UNIQUE,
        product_image BYTEA,
        location_image BYTEA,
        location TEXT
    )
`, (err) => {
    if (err) {
        console.error('Error creating products table:', err.message);
    }
});



client.query(`CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    location_name TEXT UNIQUE
)
`, (err) => {
    if (err) {
        console.error('Error creating tables:', err.message);
    }
});



app.get('/api/categories', async (req, res) => {
    try {
        // Log the start of the request
        console.log('Received request for /api/categories');

        // Fetch categories from the database
        const result = await client.query('SELECT id, categorie_name, categorie_image FROM categ');

        // Log the fetched categories
        console.log('Fetched categories:', result.rows);

        // Convert image buffer to Base64
        const categories = result.rows.map(category => {
            if (category.categorie_image) {
                // Convert buffer to Base64 string
                const base64Image = category.categorie_image.toString('base64');
                return {
                    ...category,
                    categorie_image: `data:image/jpeg;base64,${base64Image}`
                };
            } else {
                // Handle case where there is no image
                return {
                    ...category,
                    categorie_image: 'path/to/default/image.png' // Fallback image URL
                };
            }
        });

        // Respond with the categories
        res.json({ categories });
    } catch (error) {
        // Log detailed error information
        console.error('Error fetching categories:', error.message);
        console.error('Stack trace:', error.stack);

        // Respond with a 500 status and error message
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

app.get('/', (req, res) => {
    // Get the IP address of the client
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    res.send(`Your IP address is: ${ip}`);
});

app.get('/api/products-list', async (req, res) => {
    try {
        // Query to get product names and identifiers from the product table
        const result = await client.query('SELECT name, identifier FROM products');
        
        // Send the results back as JSON
        res.json(result.rows);
    } catch (err) {
        console.error('Error querying the database:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
app.get('/api/locations', async (req, res) => {
    try {
        // Log the start of the request
        console.log('Received request for /api/locations with cityId:', req.query.cityId);

        // Get the cityId from query parameters
        const cityId = req.query.cityId;

        if (!cityId) {
            return res.status(400).json({ error: 'City ID is required' });
        }

        // Fetch locations for the specified city from the database
        const result = await client.query(
            'SELECT id, location_name FROM locations WHERE city_id = $1',
            [cityId]
        );

        // Log the fetched locations
        console.log('Fetched locations:', result.rows);

        // Respond with the locations
        res.json({ locations: result.rows });
    } catch (error) {
        // Log detailed error information
        console.error('Error fetching locations:', error.message);
        console.error('Stack trace:', error.stack);

        // Respond with a 500 status and error message
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

app.post('/removeLocation', async (req, res) => {
    try {
        // Extract the location name from the request body
        const { location_name } = req.body;

        // Ensure the location name is provided
        if (!location_name) {
            return res.status(400).json({ error: 'Location name is required' });
        }

        // Query to delete the location by name (assuming a unique constraint or handling is in place)
        const result = await client.query('DELETE FROM locations WHERE location_name = $1 RETURNING *', [location_name]);

        // Check if a location was deleted
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }

        // Respond with a success message
        res.status(200).json({ message: 'Location removed successfully' });
    } catch (error) {
        // Handle any errors
        console.error('Error removing location:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/addlocation', async (req, res) => {
    const { location_name } = req.body;

    if (!location_name) {
        return res.status(400).send('Location name is required.');
    }

    try {
        await client.query('INSERT INTO locations (location_name) VALUES ($1) ON CONFLICT (location_name) DO NOTHING', [location_name]);
        res.send('Location added successfully.');
    } catch (err) {
        console.error('Error adding location:', err.message);
        res.status(500).send('Error adding location.');
    }
});

// Function to create a new wallet address
async function createWalletAddress(user_id) {
    try {
        const response = await axios.post('https://coinremitter.com/api/v3/LTC/get-new-address', {
            api_key: '$2b$10$ZpskXdVsknpQzMrX5qAZTujyedQaz0Dxo1DQqlHi6sxoF5eUTJMZK',
            password: 'test2023',
            label: user_id
        });

        if (response.data.flag === 1) {
            const newAddress = response.data.data.address;
            return newAddress;
        } else {
            throw new Error('Failed to create wallet address');
        }
    } catch (error) {
        console.error('Error creating wallet address:', error.message);
        throw error;
    }
}
function extractPrice(weightType) {
    const priceMatch = weightType.match(/\$([\d,]+(?:\.\d{2})?)/); // Match a price format with or without decimals
    return priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0; // Convert to float and remove commas
}
app.post('/api/place-order', (req, res) => {
    const { 
        deliveryAddress, 
        deliveryDate, 
        contactInfo, 
        items, 
        comments, 
        orderId, 
        deliveryState, 
        isPrime, 
        shipping, 
        shippingfee, 
        total,
        usedcode, // Extract usedcode
        discount_text, // Provide default value if not present
        shipping_text , // Provide default value if not present
        promocode_text,
        additional,
        def_disc,
        userId  // Provide default value if not present
    } = req.body;

    console.log(req.body);

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items in order.' });
    }
    const primeGiftText = isPrime === true ? 'Add double mystery gifts' : ''; // Check if user is prime

    // Prepare message content
    let itemsMessage = items.map(item => {
        let pricePerUnit;

        // Determine price per unit based on item type
        switch (item.type) {
            case 'grams':
                pricePerUnit = item.pricePerGram;
                break;
            case 'oz':
                pricePerUnit = item.pricePerOz;
                break;
            case 'qp':
                pricePerUnit = item.pricePerQp;
                break;
            case 'half-pound':
                pricePerUnit = item.pricePerHalfP;
                break;
            case 'lbs':
                pricePerUnit = item.pricePer1Lb;
                break;
            default:
                pricePerUnit = 0; // Default if type is not recognized
        }

        return `
Product name: ${item.productName}
Quantity: ${parseFloat(item.quantity)}x ${item.weightType}
Total for Item: $${item.price}
Product Comments: 
${item && item.comm !== undefined ? item.comm : ''}
`;
    }).join('\n\n');

    const message = `
Order # ${orderId}

Name: ${deliveryDate}
Street Address: ${deliveryAddress}
City, State ZIP: ${deliveryState}
Contact Info: ${contactInfo}
Is Prime: ${isPrime !== undefined ? isPrime : 'No'}
Shipping: ${shipping}
Shipping Fee: ${shippingfee}

Total Before Discount: $${def_disc}
Total: ${total}
Used Code: ${usedcode || 'None'}
Discounts: ${additional || 'None'}

Order Items:

${itemsMessage}

${primeGiftText}

    `;

    // Send message via Telegram bot
    axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: '7047762092', // Replace with your hardcoded chat ID
        text: message,
        parse_mode: 'Markdown' // Optional: Use Markdown for formatting
    })
    .then(response => {
        console.log('Message sent to hardcoded chat ID:', response.data);
    })
    .catch(error => {
        console.error('Error sending message to hardcoded chat ID:', error);
    });
    
    axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: '5838062267', // Replace with your hardcoded chat ID
        text: message,
        parse_mode: 'Markdown' // Optional: Use Markdown for formatting
    })
    .then(response => {
        console.log('Message sent to hardcoded chat ID:', response.data);
    })
    .catch(error => {
        console.error('Error sending message to hardcoded chat ID:', error);
    });
    
    // Send message to the chat ID stored in the variable
    axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: userId, // Use the variable holding the chat ID
        text: message,
        parse_mode: 'Markdown' // Optional: Use Markdown for formatting
    })
    .then(response => {
        console.log('Message sent to userId chat ID:', response.data);
        res.json({ success: true, message: 'Order placed successfully.' });

    })
    .catch(error => {
        console.error('Error sending message to userId chat ID:', error);
    });


});



// Route to add or remove admin users
app.post('/admins', async (req, res) => {
    const { action, user_id } = req.body;
    console.log(action, user_id);
    if (!action || !user_id) {
        return res.status(400).send('Action and user ID are required.');
    }

    try {
        if (action === 'add') {
            // Add admin user
            await client.query('INSERT INTO admin (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [user_id]);
            res.send('Admin user added successfully.');
        } else if (action === 'remove') {
            // Remove admin user
            const result = await client.query('DELETE FROM admin WHERE user_id = $1 RETURNING *', [user_id]);

            if (result.rowCount > 0) {
                res.send('Admin user removed successfully.');
            } else {
                res.status(404).send('Admin user not found.');
            }
        } else {
            res.status(400).send('Invalid action. Use "add" or "remove".');
        }
    } catch (err) {
        console.error('Error handling admin user request:', err.message);
        res.status(500).send('Internal server error.');
    }
});
app.post('/api/discount', async (req, res) => {
    const { discount } = req.body;

    try {
        // Delete all existing discounts
        await client.query('DELETE FROM discount');

        // Insert the new discount into the database
        const query = 'INSERT INTO discount (discount) VALUES ($1)';
        await client.query(query, [discount]);

        res.status(200).send('Discount saved successfully');
    } catch (error) {
        console.error('Error saving discount:', error);
        res.status(500).send('Error saving discount');
    }
})


app.get('/api/discount', async (req, res) => {
    try {
        // Query to select one discount
        const result = await client.query('SELECT discount FROM discount LIMIT 1');

        // Check if any discount is found
        if (result.rows.length > 0) {
            // Respond with the discount
            console.log(result.rows[0].discount )
            res.json({ discount: result.rows[0].discount });
        } else {
            // If no discount found, respond with a message
            res.json({ discount: null, message: 'No discount found' });
        }
    } catch (error) {
        console.error('Error retrieving discount:', error);
        // Respond with an internal server error
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/get-promocodes', async (req, res) => {
    try {
        const result = await client.query('SELECT code, amount FROM promo');
        const promocodes = result.rows;

        res.json({
            success: true,
            promocodes: promocodes
        });
    } catch (err) {
        console.error('Error fetching promocodes:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching promocodes'
        });
    }
});

app.get('/promocodes', async (req, res) => {
    try {
        const result = await client.query('SELECT code, amount FROM promo');
        res.json({ success: true, promocodes: result.rows });
    } catch (error) {
        console.error('Error fetching promocodes:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch promocodes.' });
    }
});

// Route to add a promocode
app.post('/promocodes', async (req, res) => {
    const { code, amount } = req.body;
    try {
        await client.query('INSERT INTO promo (code, amount) VALUES ($1, $2)', [code, amount]);
        res.json({ success: true, message: 'Promocode added successfully.' });
    } catch (error) {
        console.error('Error adding promocode:', error.message);
        res.status(500).json({ success: false, message: 'Failed to add promocode.' });
    }
});

// Route to delete a promocode
app.delete('/promocodes', async (req, res) => {
    const { code } = req.body;
    try {
        await client.query('DELETE FROM promo WHERE code = $1', [code]);
        res.json({ success: true, message: 'Promocode deleted successfully.' });
    } catch (error) {
        console.error('Error deleting promocode:', error.message);
        res.status(500).json({ success: false, message: 'Failed to delete promocode.' });
    }
})


// Route to list admin users
app.get('/admins', async (req, res) => {
    try {
        const result = await client.query('SELECT user_id FROM admin');  // Adjust query based on your database schema
        const admins = result.rows.map(row => row.user_id);
        res.json(admins);
        
    } catch (err) {
        console.error('Error fetching admins:', err.message);
        res.status(500).send('Error fetching admins.');
    }
});
// Route to handle uploading product images and location images
app.get('/product-media/:identifier', async (req, res) => {
    const { identifier } = req.params;

    try {
        const result = await client.query(`
            SELECT media_data
            FROM products
            WHERE identifier = $1
        `, [identifier]);

        if (result.rows.length > 0) {
            const mediaData = result.rows[0].media_data;

            // Directly use mediaData as it's already a JavaScript object
            res.json({
                product_images: mediaData.images || [],
                product_videos: mediaData.videos || []
            });
        } else {
            res.status(404).send('Product not found.');
        }
    } catch (err) {
        console.error('Error retrieving media data:', err.message);
        res.status(500).send('Error retrieving media.');
    }
});

const generateRandomNumber = () => Math.floor(Math.random() * 1000000000);

const Dropbox = require('dropbox').Dropbox;
const fetch = require('isomorphic-fetch');

// Initialize Dropbox client with a placeholder token for now
const dbx = new Dropbox({ accessToken: 'your_access_token', fetch: fetch });

// Function to get the access token from the database
async function getAccessToken() {
    try {
        const res = await client.query('SELECT user_id FROM admin_users LIMIT 1');
        const token = res.rows[0]?.user_id; // Assuming user_id stores the access token
        return token;
    } catch (err) {
        console.error('Error retrieving access token:', err);
        throw new Error('Failed to retrieve access token');
    }
}

app.post('/upload-product', upload.fields([
    { name: 'productImages[]', maxCount: 10 },
    { name: 'productVideos[]', maxCount: 5 }
]), async (req, res) => {
    const {
        price, name, categorie, identifier,
        price_per_gram, price_per_oz, price_per_qp,
        price_per_half_p, price_per_1lb, description,
        bulk_quantity, bulk_price, weight_type, custom_quantity, custom_bulk_price
    } = req.body;

    console.log(req.body);
    const productImages = req.files['productImages[]'] || [];
    const productVideos = req.files['productVideos[]'] || [];

    console.log(req.files); // Debugging line to check received files

    if (productImages.length === 0 && productVideos.length === 0) {
        return res.status(400).send('At least one image or video is required.');
    }

    try {
        // Get Dropbox access token
        const accessToken = await getAccessToken();
        const dbx = new Dropbox({ accessToken, fetch: fetch });

        // Process and save images as base64
        const base64Images = await Promise.all(
            productImages.map(async (file) => {
                console.log('Processing image file:', file);
                const compressedImage = await sharp(file.buffer)
                    .resize(800) // Resize if needed (optional)
                    .jpeg({ quality: 20 }) // Compress and set quality
                    .toBuffer();
                return `data:image/jpeg;base64,${compressedImage.toString('base64')}`;
            })
        );

        // Upload videos to Dropbox and get file links
        const videoLinks = await Promise.all(
            productVideos.map(async (file) => {
                console.log('Uploading video file:', file.originalname);
                const filePath = `/${file.originalname}`;
                const response = await dbx.filesUpload({
                    path: filePath,
                    contents: file.buffer
                });

                // Create a shared link for the uploaded file
                const sharedLinkResponse = await dbx.sharingCreateSharedLinkWithSettings({
                    path: filePath
                });

                return sharedLinkResponse.result.url.replace('dl=0', 'dl=1'); // Get a direct download link
            })
        );

        // Combine all images and videos into a single JSON object
        const mediaData = JSON.stringify({
            images: base64Images,
            videos: videoLinks
        });

        // Determine final price
        const pricePerGram = parseFloat(price_per_gram) || 0;
        const pricePerOz = parseFloat(price_per_oz) || 0;
        const pricePerQp = parseFloat(price_per_qp) || 0;
        const pricePerHalfP = parseFloat(price_per_half_p) || 0;
        const pricePer1Lb = parseFloat(price_per_1lb) || 0;
        const weightPrices = {};


        if (pricePerGram > 0) { 
            weightPrices[1] = []
            weightPrices[1].push({
                quantity: 32,
                price: pricePerQp / 32
            });
            weightPrices[1].push({
                quantity: 8,
                price: pricePerOz / 8
            });
            weightPrices[1].push({
                quantity: 64,
                price: pricePerHalfP / 64
            });
            weightPrices[1].push({
                quantity: 128,
                price: pricePer1Lb / 128
            });
        }

        if (pricePerOz > 0) { 
            weightPrices[2] = []

            weightPrices[2].push({
                quantity: 4,
                price: pricePerQp / 4
            });
            weightPrices[2].push({
                quantity: 16,
                price: pricePer1Lb / 16
            });
            weightPrices[2].push({
                quantity: 8,
                price: pricePerHalfP / 8
            });
        }
        if (pricePerQp > 0) { 
            weightPrices[3] = []

            weightPrices[3].push({
                quantity: 4,
                price: pricePer1Lb / 4
            });
            weightPrices[3].push({
                quantity: 2,
                price: pricePerHalfP / 2
            });
        }

        if (pricePerHalfP > 0) { 
            weightPrices[4] = []

            weightPrices[4].push({
                quantity: 2,
                price: pricePer1Lb / 2
            });
            
        }

        // Array of price per unit
        const unitPrices = [pricePerGram, pricePerOz, pricePerQp, pricePerHalfP, pricePer1Lb];

        // Determine final price
        const hasValidUnitPrice = unitPrices.some(p => p > 0);
        const finalPrice = hasValidUnitPrice ? 0 : parseFloat(price) || 0;

        // Process bulk pricing data
        const bulkPrices = (bulk_quantity || []).reduce((acc, quantity, index) => {
            const price = (bulk_price || [])[index];
            if (quantity && price) {
                acc[quantity] = parseFloat(price);
            }
            return acc;
        }, {});


        // Populate the weightPrices object only if weight_type is provided
        if (weight_type && custom_quantity && custom_bulk_price) {
            weight_type.forEach((type, index) => {
                const quantity = custom_quantity[index];
                const price = custom_bulk_price[index];

                // Initialize the type key if it does not exist
                if (!weightPrices[type]) {
                    weightPrices[type] = [];
                }

                // Add quantity and price if they are valid
                if (quantity && price) {
                    weightPrices[type].push({
                        quantity: parseFloat(quantity),
                        price: parseFloat(price)
                    });
                }
            });
        }

        console.log(weightPrices);
        // Store all media in a single row
        await client.query(`
            INSERT INTO products (name, categorie, identifier, price, price_per_gram, price_per_oz, price_per_qp, price_per_half_p, price_per_1lb, media_data, description, bulk_price, weight_prices)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [name, categorie, identifier, finalPrice, price_per_gram, price_per_oz, price_per_qp, price_per_half_p, price_per_1lb, mediaData, description, JSON.stringify(bulkPrices), JSON.stringify(weightPrices)]);

        res.send('Product successfully uploaded and changes committed.');
    } catch (err) {
        console.error('Detailed error:', err);
        res.status(500).send('Error saving product.');
    }
});
app.post('/upload-prime-members', (req, res) => {
    const members = req.body;
    const errors = [];
    const promises = [];

    // Check if the request body is a valid array
    if (!Array.isArray(members) || members.length === 0) {
        return res.status(400).send('Invalid data format');
    }

    // Delete all existing records in the contacts table
    const deleteQuery = 'DELETE FROM contacts';
    const deletePromise = client.query(deleteQuery)
        .catch(err => {
            console.error('Error deleting existing records:', err);
            return Promise.reject('Error deleting existing records');
        });

    // Add the delete promise to the promises array
    promises.push(deletePromise);

    // Prepare insert queries for new members
    members.forEach(member => {
        const query = 'INSERT INTO contacts (username, email) VALUES ($1, $2)';
        const values = [member.username, member.email];

        const promise = client.query(query, values)
            .catch(err => {
                console.error('Error saving to database:', err);
                errors.push(`Error for user ${member.username}: ${err.message}`);
            });

        promises.push(promise);
    });

    // Execute all promises
    Promise.all(promises)
        .then(() => {
            if (errors.length > 0) {
                res.status(500).send(errors.join('; '));
            } else {
                res.send('Members uploaded successfully');
            }
        })
        .catch(error => {
            console.error('Error during database operations:', error);
            res.status(500).send('An error occurred during the operation.');
        });
});




app.post('/check-prime-email', async (req, res) => {
    const { email } = req.body; // Get the email from the request body
    console.log('Received email:', email);

    try {
        // Query the database to check if the email exists for prime members (case-insensitive)
        const result = await client.query('SELECT * FROM contacts WHERE LOWER(email) = LOWER($1)', [email]);
        console.log('Query result:', result);

        // Check if any user was found
        if (result.rows && result.rows.length > 0) {
            console.log('Valid prime member email:', result.rows[0]);
            return res.json({ valid: true });
        } else {
            console.log('Invalid prime member email');
            return res.json({ valid: false });
        }
    } catch (error) {
        console.error('Error checking email:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/check-username', async (req, res) => {
    const { username } = req.body;
    console.log('Received username:', username);

    try {
        // Query the database to check if the username exists
        const result = await client.query('SELECT * FROM contacts WHERE LOWER(username) = LOWER($1)', [username]);
        console.log('Query result:', result);

        // Check if any user was found
        if (result.rows && result.rows.length > 0) {
            console.log('User exists:', result.rows[0]);
            return res.json({ exists: true });
        } else {
            console.log('User does not exist');
            return res.json({ exists: false });
        }
    } catch (error) {
        console.error('Error checking username:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});




app.get('/auth', (req, res) => {
    const clientId = 'YOUR_APP_KEY';
    const redirectUri = 'https://www.realcalidirect.com/auth/callback'; // Your redirect URI
    res.redirect(`https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}`);
});



app.post('/store-access-token', async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).json({ error: 'Missing accessToken' });
    }

    try {
        // Delete all existing records from the table
        await client.query('DELETE FROM admin_users');

        // Insert the new access token into the user_id column
        const query = `
            INSERT INTO admin_users (user_id)
            VALUES ($1);
        `;
        await client.query(query, [accessToken]);

        res.status(200).json({ message: 'Access token stored successfully' });
    } catch (error) {
        console.error('Error storing access token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Route to check if a user exists and create a wallet if not
app.post('/api/check-user', async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).send('User ID is required.');
    }

    try {
        const result = await client.query('SELECT * FROM users WHERE user_id = $1', [user_id]);
        const row = result.rows[0];

        if (row) {
            res.json({ exists: true, walletAddress: row.wallet_address });
        } else {
            try {
                const walletAddress = await createWalletAddress(user_id);

                await client.query('INSERT INTO users (user_id, wallet_address) VALUES ($1, $2)', [user_id, walletAddress]);

                res.json({ exists: false, walletAddress });
            } catch (error) {
                console.error('Error creating wallet address:', error.message);
                res.status(500).send('Error creating wallet address.');
            }
        }
    } catch (error) {
        console.error('Error handling request:', error.message);
        res.status(500).send('Internal server error.');
    }
});

// Route to handle form submissions
app.post('/submit-product', upload.fields([{ name: 'image' }, { name: 'locationimage' }]), async (req, res) => {
    const { latitude, longitude, weight, price, name, type, location, identifier } = req.body;
    const product_image = req.files['image'][0]?.buffer;
    const location_image = req.files['locationimage'][0]?.buffer;

    if (!product_image || !location_image) {
        return res.status(400).send('Both images are required.');
    }

    try {
        // Compress images using sharp
        const compressedProductImage = await sharp(product_image)
            .resize(800) // Resize if needed (optional)
            .jpeg({ quality: 40 }) // Compress and set quality (adjust as needed)
            .toBuffer();

        const compressedLocationImage = await sharp(location_image)
            .resize(800) // Resize if needed (optional)
            .jpeg({ quality: 40 }) // Compress and set quality (adjust as needed)
            .toBuffer();

        await client.query(`
            INSERT INTO products (latitude, longitude, weight, price, name, type, location, identifier, product_image, location_image)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [latitude, longitude, weight, price, name, type, location, identifier, compressedProductImage, compressedLocationImage]);

        res.send('Product successfully uploaded.');
    } catch (err) {
        console.error('Error processing or inserting data:', err.message);
        res.status(500).send('Error saving product.');
    }
});

// Route to retrieve all transactions for a user
app.post('/api/orders', async (req, res) => {
    console.log("POST /api/orders endpoint hit"); // Add this line
    const { userId } = req.body;
    
    
    if (!userId) {
        return res.status(400).send('User ID is required.');
    }

    try {
        const result = await client.query('SELECT * FROM transactions WHERE user_id = $1', [userId]);
        const rows = result.rows;

        if (rows.length > 0) {
            res.json(rows);
        } else {
            res.status(404).send('No transactions found for this user.');
        }
    } catch (err) {
        console.error('Error retrieving transactions:', err.message);
        res.status(500).send('Error retrieving transactions.');
    }
});


app.get('/api/checkActiveTransactions', async (req, res) => {
    try {
        const userId = req.query.userId; // Get userId from query parameters

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Query to select active transactions
        const query = 'SELECT * FROM orders WHERE user_id = $1';
        const values = [userId]; // Adjust based on your status column

        // Execute the query
        const result = await client.query(query, values);

        // Check if there are active transactions
        if (result.rows.length > 0) {
            // If there are active transactions, return the details of the first one
            const transaction = result.rows[0];
            res.json({
                hasActiveTransaction: true,
                transaction: {
                    id: transaction.id,
                    user_id: transaction.user_id,
                    price: transaction.price,
                    amount_in_ltc: transaction.amount_in_ltc,
                    wallet_address: transaction.wallet_address,
                    created_at: transaction.created_at,
                    status: transaction.status,
                    product_id: transaction.product_id
                }
            });
        } else {
            // If no active transactions, return false
            res.json({ hasActiveTransaction: false });
        }
    } catch (error) {
        console.error('Error querying database:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/create-transaction', async (req, res) => {
    const { user_id, price, amount_in_ltc, wallet_address, product_id } = req.body;

    // Validate input data
    if (!user_id || !price || !amount_in_ltc || !wallet_address || !product_id) {
        return res.status(400).send('All fields are required.');
    }

    // Convert input data to correct types
    const userIdInt = parseInt(user_id, 10);
    const priceFloat = parseFloat(price);
    const amountInLtcFloat = parseFloat(amount_in_ltc);

    try {
        // Check for existing transaction with the same user_id and product_id
        const checkQuery = `
            SELECT COUNT(*) AS count
            FROM orders
            WHERE user_id = $1
              AND product_id = $2
        `;

        const checkResult = await client.query(checkQuery, [userIdInt, product_id]);
        const count = parseInt(checkResult.rows[0].count, 10);

        if (count > 0) {
            // Existing transaction found, do nothing
            console.log('Duplicate transaction detected, no new record created.');
            return res.status(200).send('Duplicate transaction detected, no new record created.');
        }

        // Insert new transaction into the database
        const insertQuery = `
            INSERT INTO orders (user_id, price, amount_in_ltc, wallet_address, status, product_id)
            VALUES ($1, $2, $3, $4, 'pending', $5)
        `;

        await client.query(insertQuery, [userIdInt, priceFloat, amountInLtcFloat, wallet_address, product_id]);

        res.status(200).send('Transaction created successfully.');
    } catch (err) {
        console.error('Error creating transaction:', err.message);
        res.status(500).send('Error creating transaction.');
    }
});








// Route to delete a transaction
app.post('/api/deleteTransaction', async (req, res) => {
    const { productId, userId } = req.body;

    console.log('Received delete request:', { productId, userId }); // Log incoming request

    if (!productId || !userId) {
        console.log('Product ID or User ID missing');
        return res.status(400).send('Product ID and User ID are required.');
    }

    try {
        const result = await client.query(
            'DELETE FROM orders WHERE product_id = $1 AND user_id = $2 RETURNING *',
            [productId, userId]
        );

        console.log('Delete result:', result); // Log query result

        if (result.rowCount > 0) {
            res.send('Transaction deleted successfully.');
        } else {
            res.status(404).send('Transaction not found.');
        }
    } catch (err) {
        console.error('Error deleting transaction:', err.message);
        res.status(500).send('Error deleting transaction.');
    }
});


// Route to delete a product
app.delete('/product/:identifier', async (req, res) => {
    const identifier = req.params.identifier;

    try {
        const result = await client.query('DELETE FROM products WHERE identifier = $1 RETURNING *', [identifier]);

        if (result.rowCount > 0) {
            res.send('Product successfully deleted.');
        } else {
            res.status(404).send('Product not found.');
        }
    } catch (err) {
        console.error('Error deleting product:', err.message);
        res.status(500).send('Error deleting product.');
    }
});





app.get('/api/getBalance', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).send('User ID is required');
    }

    try {
        const result = await client.query('SELECT balance FROM users WHERE user_id = $1', [userId]);
        
        if (result.rows.length > 0) {
            const balance = result.rows[0].balance;
            res.json({ balance: balance });
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error fetching balance:', error.message);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/api/getproductstest', async (req, res) => {
    // Retrieve identifiers from the query parameters
    const identifiers = req.query.id;

    // If no identifiers are provided, return an error response
    if (!identifiers || (Array.isArray(identifiers) && identifiers.length === 0)) {
        return res.status(400).json({ error: 'No product identifiers provided.' });
    }

    // Normalize identifiers to an array if a single identifier is passed
    const identifierArray = Array.isArray(identifiers) ? identifiers : [identifiers];

    try {
        // Prepare a parameterized query with placeholders
        const queryText = `
            SELECT * FROM products 
            WHERE identifier = ANY($1::text[])
        `;
        const result = await client.query(queryText, [identifierArray]);

        // If no products found, return a 404 response
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No products found for the given identifiers.' });
        }

        // Return the retrieved product details
        res.json(result.rows);
    } catch (err) {
        console.error('Error retrieving products:', err.message);
        res.status(500).send('Error retrieving products.');
    }
});




// Route to retrieve product details
app.get('/product/:identifier', async (req, res) => {
    const identifier = req.params.identifier;

    try {
        const result = await client.query('SELECT * FROM products WHERE identifier = $1', [identifier]);
        const row = result.rows[0];

        if (row) {
            const productDetails = {
                identifier: row.identifier,
                name: row.name,
                price: row.price,
                weight: row.weight,
                type: row.type,
                categorie: row.categorie,
                price_per_gram: row.price_per_gram,
                price_per_oz: row.price_per_oz,
                price_per_qp: row.price_per_qp,
                price_per_half_p: row.price_per_half_p,
                price_per_1lb: row.price_per_1lb,
                description: row.description,
                bulk_price: row.bulk_price,
                weight_prices: row.weight_prices
            };
            res.json(productDetails);
        } else {
            res.status(404).send('Product not found.');
        }
    } catch (err) {
        console.error('Error retrieving product:', err.message);
        res.status(500).send('Error retrieving product.');
    }
});


app.put('/product/:identifier', async (req, res) => {
    const identifier = req.params.identifier;
    const { name, price, weight, type, latitude, longitude, location } = req.body;

    // Check for required fields
    if (!name || !price || !weight || !type || !latitude || !longitude || !location) {
        return res.status(400).send('All fields are required.');
    }

    try {
        // Perform the update query
        const result = await pool.query(
            `UPDATE products
             SET name = $1, price = $2, weight = $3, type = $4, latitude = $5, longitude = $6, location = $7
             WHERE identifier = $8
             RETURNING *`,
            [name, price, weight, type, latitude, longitude, location, identifier]
        );

        if (result.rowCount > 0) {
            const updatedProduct = result.rows[0];
            const productDetails = {
                identifier: updatedProduct.identifier,
                name: updatedProduct.name,
                price: updatedProduct.price,
                weight: updatedProduct.weight,
                type: updatedProduct.type,
                latitude: updatedProduct.latitude,
                longitude: updatedProduct.longitude,
                location: updatedProduct.location
            };
            res.json(productDetails);
        } else {
            res.status(404).send('Product not found.');
        }
    } catch (err) {
        console.error('Error updating product:', err.message);
        res.status(500).send('Error updating product.');
    }
});
app.post('/api/get-user-transactions', async (req, res) => {
    const { address, userId} = req.body;

    if (!address) {
        return res.status(400).json({ flag: 0, msg: 'Address is required.' });
    }

    try {
        const response = await axios.post('https://coinremitter.com/api/v3/LTC/get-transaction-by-address', {
            api_key: '$2b$10$ZpskXdVsknpQzMrX5qAZTujyedQaz0Dxo1DQqlHi6sxoF5eUTJMZK',
            password: 'test2023',
            address: address
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const transactions = response.data.data; // Access the 'data' array directly

        if (!Array.isArray(transactions)) {
            return res.status(500).json({ flag: 0, msg: 'Unexpected response format from API.' });
        }

        try {
            await client.query('BEGIN');

            for (const tx of transactions) {
                const { id, amount } = tx;

                const result = await client.query('SELECT id FROM transfers WHERE tx_id = $1', [id]);

                if (result.rows.length > 0) {
                    await client.query(
                        'UPDATE transfers SET amount = $1, wallet_address = $2 WHERE tx_id = $3',
                        [amount, address, id]
                    );
                } else {
                    await client.query(
                        'INSERT INTO transfers (tx_id, amount, user_id, wallet_address) VALUES ($1, $2, $3, $4)',
                        [id, amount, userId, address]
                    );
                }
            }

            await client.query('COMMIT');
        } catch (dbError) {
            await client.query('ROLLBACK');
            console.error('Database error:', dbError.message);
            return res.status(500).json({ flag: 0, msg: 'Failed to sync transactions with the database.' });
        }

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching transactions:', error.message);
        res.status(500).json({ flag: 0, msg: 'Failed to fetch transactions.' });
    }
});

async function getLtcToUsdRate() {
    const apiKey = '56f6ba30-b7cc-43f8-8e86-fbf3a1803b20'; // Replace with your API key
    try {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=LTC', {
            headers: { 'X-CMC_PRO_API_KEY': apiKey }
        });
        return response.data.data.LTC.quote.USD.price;
    } catch (error) {
        throw new Error('Error fetching LTC to USD rate: ' + error.message);
    }
}


app.get('/api/products', async (req, res) => {
    console.log('Received request for products');

    // Get query parameters
    const categorie = req.query.categorie || '';

    // Construct SQL query
    let query = 'SELECT * FROM products WHERE categorie = $1';
    const queryParams = [categorie];  // Start with the categorie parameter

    // Log query for debugging
    console.log('Executing query:', query);
    console.log('Query parameters:', queryParams);

    try {
        // Execute the SQL query
        const result = await client.query(query, queryParams);
        
        // Retrieve rows from the query result
        let rows = result.rows;

        // Log the number of rows retrieved
        console.log('Query executed successfully. Number of rows retrieved:', rows.length);

        // Log the raw rows data
        console.log('Raw rows data:', rows);

        // Convert BLOB image data to Base64
        rows = rows.map(row => {
            if (row.product_image) {
                row.product_image = `data:image/png;base64,${Buffer.from(row.product_image).toString('base64')}`;
            } else if (row.location_image) { 

                row.location_image = `data:image/png;base64,${Buffer.from(row.location_image).toString('base64')}`;

            }
                
                else {
                row.product_image = ''; // or null
                console.log('Product image data is missing for row:', row);
            }
            return row;
        });

        // Send response
        res.json({ products: rows });
    } catch (err) {
        console.error('Error retrieving products:', err.message);
        res.status(500).send('Error retrieving products.');
    }
});

app.post('/edit-products', upload.fields([
    { name: 'images[]', maxCount: 10 },
    { name: 'videos[]', maxCount: 5 }
]), async (req, res) => {
    const { 
        name, 
        price, 
        description, 
        perg, 
        peroz, 
        perqp, 
        perhalfp, 
        per1lb, 
        id 
    } = req.body;
    const productImages = req.files['images[]'] || [];
    const productVideos = req.files['videos[]'] || [];

    if (productImages.length === 0 && productVideos.length === 0) {
        return res.status(400).send('At least one image or video is required.');
    }

    let bulkPrices = {};
    let weightPrices = {};


    if (perg > 0) {
        weightPrices[1] = [];
        weightPrices[1].push({ quantity: 32, price: perqp / 32 });
        weightPrices[1].push({ quantity: 8, price: peroz / 8 });
        weightPrices[1].push({ quantity: 64, price: perhalfp / 64 });
        weightPrices[1].push({ quantity: 128, price: per1lb / 128 });
    }

    if (peroz > 0) {
        weightPrices[2] = [];
        weightPrices[2].push({ quantity: 4, price: perqp / 4 });
        weightPrices[2].push({ quantity: 16, price: per1lb / 16 });
        weightPrices[2].push({ quantity: 8, price: perhalfp / 8 });
    }

    if (perqp > 0) {
        weightPrices[3] = [];
        weightPrices[3].push({ quantity: 4, price: per1lb / 4 });
        weightPrices[3].push({ quantity: 2, price: perhalfp / 2 });
    }

    if (perhalfp > 0) {
        weightPrices[4] = [];
        weightPrices[4].push({ quantity: 2, price: per1lb / 2 });
    }


    console.log('Request Body:', req.body);

    // Access the bulk quantities and prices
    const bulkQuantities = req.body['bulk_quantity[]'] || req.body.bulk_quantity || [];
    const bulkPricesArray = req.body['bulk_price[]'] || req.body.bulk_price || [];

    console.log('Bulk Quantities:', bulkQuantities);
    console.log('Bulk Prices:', bulkPricesArray);

    if (bulkQuantities.length > 0 && bulkPricesArray.length > 0) {
        bulkQuantities.forEach((quantity, index) => {
            const price = parseFloat(bulkPricesArray[index]);
            if (!isNaN(price)) {
                bulkPrices[quantity] = price;
            }
        });
    }

    // Check if bulkPrices is empty
    const isBulkPricesEmpty = Object.keys(bulkPrices).length === 0;

    const weightTypes = req.body['weight_type[]'] || [];
    const customQuantities = req.body['custom_quantity[]'] || [];
    const customPrices = req.body['custom_weight_price[]'] || [];

    if (weightTypes.length > 0) {
        weightTypes.forEach((type, index) => {
            if (!weightPrices[type]) {
                weightPrices[type] = [];
            }

            const quantity = parseInt(customQuantities[index]) || 0;
            const price = parseFloat(customPrices[index]) || 0;

            if (quantity > 0 && !isNaN(price)) {
                weightPrices[type].push({ quantity, price });
            }
        });
    }

    try {
        const accessToken = await getAccessToken();
        const dbx = new Dropbox({ accessToken, fetch: fetch });

        const base64Images = await Promise.all(
            productImages.map(async (file) => {
                const compressedImage = await sharp(file.buffer)
                    .resize(800)
                    .jpeg({ quality: 20 })
                    .toBuffer();
                return `data:image/jpeg;base64,${compressedImage.toString('base64')}`;
            })
        );

        const videoLinks = await Promise.all(
            productVideos.map(async (file) => {
                const filePath = `/${file.originalname}`;
                const response = await dbx.filesUpload({
                    path: filePath,
                    contents: file.buffer
                });

                const sharedLinkResponse = await dbx.sharingCreateSharedLinkWithSettings({
                    path: filePath
                });

                return sharedLinkResponse.result.url.replace('dl=0', 'dl=1');
            })
        );

        const mediaData = JSON.stringify({
            images: base64Images,
            videos: videoLinks
        });

        const pricePerGram = parseFloat(perg) || 0;
        const pricePerOz = parseFloat(peroz) || 0;
        const pricePerQp = parseFloat(perqp) || 0;
        const pricePerHalfP = parseFloat(perhalfp) || 0;
        const pricePer1Lb = parseFloat(per1lb) || 0;

        const unitPrices = [pricePerGram, pricePerOz, pricePerQp, pricePerHalfP, pricePer1Lb];
        const hasValidUnitPrice = unitPrices.some(p => p > 0);
        const finalPrice = hasValidUnitPrice ? 0 : parseFloat(price) || 0;

        const weightPricesValue = Object.keys(weightPrices).length > 0 ? weightPrices : null;

        // Build the SQL query conditionally
        const updateQuery = `
            UPDATE products 
            SET name = $1, 
                price = $2, 
                price_per_gram = $3, 
                price_per_oz = $4, 
                price_per_qp = $5, 
                price_per_half_p = $6, 
                price_per_1lb = $7, 
                media_data = $8,
                description = $9,
                weight_prices = $10
            ${!isBulkPricesEmpty ? ', bulk_price = $11' : ''}
            WHERE identifier = $${!isBulkPricesEmpty ? '12' : '11'};
        `;

        const queryParams = [
            name, 
            finalPrice, 
            pricePerGram, 
            pricePerOz,
            pricePerQp, 
            pricePerHalfP, 
            pricePer1Lb, 
            mediaData, 
            description, 
            weightPricesValue
        ];

        if (!isBulkPricesEmpty) {
            queryParams.push(bulkPrices, id);
        } else {
            queryParams.push(id);
        }

        await client.query(updateQuery, queryParams);

        res.status(200).json({ message: 'Product successfully updated.' });
    } catch (err) {
        console.error('Detailed error:', err);
        res.status(500).json({ error: 'Error saving product.' });
    }
});





app.get('/api/search-category', async (req, res) => {
    const { name } = req.query;

    try {
        const result = await client.query('SELECT id, categorie_name, categorie_image FROM categ WHERE categorie_name ILIKE $1', [`%${name}%`]);
        res.json({ categories: result.rows });
    } catch (error) {
        console.error('Error searching categories:', error.message);
        res.status(500).json({ error: 'Failed to search categories' });
    }
});
app.post('/api/edit-category', upload.single('editCategoryImage'), async (req, res) => {
    const { categoryId, categoryName } = req.body;
    const categoryImageBuffer = req.file ? req.file.buffer : null;

    let compressedImageBuffer = null;

    if (categoryImageBuffer) {
        try {
            // Compress and convert the image to PNG format
            compressedImageBuffer = await sharp(categoryImageBuffer)
                .resize({ width: 800 }) // Resize to width 800px, adjust as needed
                .png({ quality: 1 }) // Set PNG quality, adjust as needed
                .toBuffer();
        } catch (error) {
            console.error('Error processing image:', error.message);
            return res.status(500).send('Error processing image');
        }
    }

    try {
        await client.query(
            `UPDATE categ
             SET categorie_name = $1,
                 categorie_image = COALESCE($2, categorie_image)
             WHERE id = $3`,
            [categoryName, compressedImageBuffer, categoryId]
        );
        res.status(200).send('Category updated successfully');
    } catch (error) {
        console.error('Error updating category:', error.message);
        res.status(500).send('Error updating category');
    }
});



app.delete('/api/delete-category', async (req, res) => {
    const { categoryId } = req.body;

    try {
        await client.query('DELETE FROM categ WHERE id = $1', [categoryId]);
        res.status(200).send('Category deleted successfully');
    } catch (error) {
        console.error('Error deleting category:', error.message);
        res.status(500).send('Error deleting category');
    }
});

app.post('/upload-category', upload.single('categoryImage'), async (req, res) => {
    const { categoryName } = req.body;
    const categoryImageBuffer = req.file ? req.file.buffer : null;

    try {
        let compressedImageBuffer = null;

        if (categoryImageBuffer) {
            // Use Sharp to process the image
            compressedImageBuffer = await sharp(categoryImageBuffer)
                .resize(800) // Resize if needed (adjust dimensions as needed)
                .png({ quality: 1 }) // Compress the image to the lowest quality
                .toBuffer();
        }

        // Insert category data into the database
        await client.query(
            'INSERT INTO categ (categorie_name, categorie_image) VALUES ($1, $2)',
            [categoryName, compressedImageBuffer]
        );

        res.status(201).send('Category added successfully');
    } catch (error) {
        console.error('Error inserting category:', error);
        res.status(500).send('Error inserting category');
    }
});


app.post('/webhook', (req, res) => {
    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Error parsing form:', err);
            res.status(400).send('Error parsing form');
            return;
        }

        const address = Array.isArray(fields.address) ? fields.address[0] : fields.address;
        const amount = Array.isArray(fields.amount) ? fields.amount[0] : fields.amount;
        const type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
        const txId = Array.isArray(fields.id) ? fields.id[0] : fields.id;

        console.log('Received address:', address);
        console.log('Received amount:', amount);
        console.log('Received type:', type);
        console.log('Received tx_id:', txId);

        try {
            // Query user ID from database
            const userIdResult = await client.query(
                'SELECT user_id FROM users WHERE wallet_address = $1',
                [address]
            );

            if (userIdResult.rows.length === 0) {
                console.log('No user found with the provided address.');
                res.status(404).send('User not found');
                return;
            }

            const userId = userIdResult.rows[0].user_id;
            console.log('User ID:', userId);

            if (type === 'receive') {
                // Check if a transaction with the given tx_id exists in the transfers table
                const txCheckResult = await client.query(
                    'SELECT 1 FROM transfers WHERE tx_id = $1',
                    [txId]
                );

                if (txCheckResult.rows.length > 0) {
                    console.log('Transaction with the given tx_id already exists.');
                    res.status(400).send('Transaction already exists');
                    return;
                }

                const trimmedAddressLabel = address;
                const amountInFloat = parseFloat(amount);

                // Get LTC to USD conversion rate
                const ltcToUsdRate = await getLtcToUsdRate();
                const amountInUsd = amountInFloat * ltcToUsdRate;

                // Add the received amount to the user's balance
                await client.query(
                    'UPDATE users SET balance = balance + $1 WHERE wallet_address = $2',
                    [amountInUsd, trimmedAddressLabel]
                );
                console.log('User balance updated successfully.');

                // Record the transaction in the transfers table
                await client.query(
                    'INSERT INTO transfers (tx_id, amount, user_id, wallet_address) VALUES ($1, $2, $3, $4)',
                    [txId, amountInUsd, userId, trimmedAddressLabel]
                );
                console.log('Transaction recorded in transfers table.');

                // Check for pending orders for the user
                const ordersResult = await client.query(
                    'SELECT amount_in_ltc, product_id FROM orders WHERE wallet_address = $1',
                    [trimmedAddressLabel]
                );

                if (ordersResult.rows.length > 0) {
                    const amountInLtc = ordersResult.rows[0].amount_in_ltc;
                    const productId = ordersResult.rows[0].product_id;

                    console.log('Amount in LTC from database:', amountInLtc);

                    const acceptableDifference = 1; // $1 tolerance
                    if (amountInFloat >= amountInLtc - acceptableDifference) {
                        console.log('Transaction valid.');

                        // Deduct the amount needed for the product
                        await client.query(
                            'UPDATE users SET balance = balance - $1 WHERE wallet_address = $2',
                            [amountInLtc * ltcToUsdRate, trimmedAddressLabel]
                        );
                        console.log('User balance updated after deducting product price.');

                        // Delete the transaction from the orders table
                        await client.query('DELETE FROM orders WHERE product_id = $1 AND wallet_address = $2', [productId, trimmedAddressLabel]);
                        console.log('Transaction deleted successfully.');

                        // Delete the product from the database


                        // Fetch product information for sending to user
                        const productResult = await client.query(
                            'SELECT location_image, latitude, longitude FROM products WHERE identifier = $1',
                            [productId]
                        );

                        if (productResult.rows.length > 0) {
                            const row = productResult.rows[0];
                            const latitude = (row.latitude || '').trim();
                            const longitude = (row.longitude || '').trim();

                            if (row.location_image) {
                                // Save the image as a JPG file
                                const filePath = path.join(__dirname, 'location_image.jpg');
                                fs.writeFile(filePath, row.location_image, 'base64', (err) => {
                                    if (err) {
                                        console.error('Error saving image:', err.message);
                                        return;
                                    }
                                    console.log('Image saved successfully.');

                                    // Send the image to the user via Telegram
                                    bot.telegram.sendPhoto(userId, { source: filePath })
                                        .then(() => {
                                            console.log('Image sent successfully.');
                                            // Delete the image file after sending
                                            fs.unlink(filePath, (err) => {
                                                if (err) {
                                                    console.error('Error deleting image:', err.message);
                                                } else {
                                                    console.log('Image deleted successfully.');
                                                }
                                            });
                                        })
                                        .catch(error => {
                                            console.error('Error sending image to Telegram:', error.message);
                                        });

                                    // Send confirmation message to user
                                    bot.telegram.sendMessage(userId, `Ձեր գործարքը վավեր է և հաջողությամբ մշակվել է:\nԿոորդինատներ : ${longitude}, ${latitude} \n https://yandex.com/maps/?ll=${longitude}%2C${latitude}`, { parse_mode: 'HTML' });
                                });

                        await client.query('DELETE FROM products WHERE identifier = $1', [productId]);
                        console.log('Product deleted successfully.');
                            } else {
                                console.log('No location image found for the product.');
                                // Send a message without image if needed
                                bot.telegram.sendMessage(userId, 'Ձեր գործարքը վավեր է և հաջողությամբ մշակվել է:');

                                // Send confirmation message to user
                                bot.telegram.sendMessage(userId, `Ձեր գործարքը վավեր է և հաջողությամբ մշակվել է:\nԿոորդինատներ : ${longitude}, ${latitude} \n https://yandex.com/maps/?ll=${longitude}%2C${latitude}`, { parse_mode: 'HTML' });
                            }
                        } else {
                            console.log('No product found for the given product ID.');
                            bot.telegram.sendMessage(userId, `Ստացել ենք ձեր փոխանցումը բայց չկարողացանք հաստատել ապրանքի արկայությունը, խնդրեում ենք կապնվել օպերատորին`, { parse_mode: 'HTML' });
                        }
                    } else {
                        console.log('Transaction amount is less than required. Amount:', amountInFloat, 'Required:', amountInLtc);
                        bot.telegram.sendMessage(userId, 'Գործարքի գումարը պահանջվածից պակաս է: ');
                    }
                } else {
                    // No pending orders for the user
                    console.log('No transactions found for the user.');
                    bot.telegram.sendMessage(userId, 'Մենք չգտանք ձեր գործարքը մեր տվյալներում: ');
                }

                res.status(200).send('Webhook received');
            } else {
                console.log('Webhook type is not receive. Type:', type);
                res.status(400).send('Invalid webhook type');
            }
        } catch (error) {
            console.error('Error processing webhook:', error.message);
            res.status(500).send('Internal Server Error');
        }
    });
});




// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

