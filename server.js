const http = require('http');
const fs = require('fs');
const path = require('path');

// Automatically compile config.js from env variables / .env file on startup
require('./generate-config');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

// Initialize Razorpay client
const Razorpay = require('razorpay');
let razorpayClient = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
} else {
  console.warn("Warning: Razorpay credentials are not configured in .env file.");
}

// Helper to parse JSON body from incoming requests
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (!body) {
          resolve({});
        } else {
          resolve(JSON.parse(body));
        }
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

// Helper to send JSON responses
function sendJsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// API Handler to create Razorpay orders
async function handleCreateOrder(req, res) {
  try {
    if (!razorpayClient) {
      return sendJsonResponse(res, 500, { error: 'Razorpay integration is not configured on backend.' });
    }

    const body = await parseJsonBody(req);
    const { amount, receipt } = body;

    // Validate request
    if (!amount || isNaN(amount)) {
      return sendJsonResponse(res, 400, { error: 'Amount is required and must be a number.' });
    }
    
    const amountVal = parseInt(amount);
    if (amountVal < 100) {
      return sendJsonResponse(res, 400, { error: 'Amount must be at least 100 paise (₹1).' });
    }

    const options = {
      amount: amountVal,
      currency: 'INR',
      receipt: receipt || `rcpt_${Date.now()}`
    };

    const order = await razorpayClient.orders.create(options);
    
    console.log(`Razorpay order created successfully: ${order.id} for amount ${order.amount}`);
    return sendJsonResponse(res, 200, {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (err) {
    console.error('Failed to create Razorpay order:', err);
    return sendJsonResponse(res, 500, { error: err.message || 'Internal server error while creating Razorpay order.' });
  }
}

// API Handler to verify Razorpay signatures
async function handleVerifyPayment(req, res) {
  try {
    const body = await parseJsonBody(req);
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return sendJsonResponse(res, 400, { error: 'Missing required signature verification fields.' });
    }

    // Verify signature
    const crypto = require('crypto');
    const secret = process.env.RAZORPAY_KEY_SECRET;
    
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      console.log(`Razorpay signature verification succeeded for order ${razorpay_order_id}`);
      return sendJsonResponse(res, 200, { status: 'ok', message: 'Payment signature verified successfully.' });
    } else {
      console.warn(`Razorpay signature verification failed for order ${razorpay_order_id}`);
      return sendJsonResponse(res, 400, { error: 'Payment signature verification failed. Mismatch detected.' });
    }
  } catch (err) {
    console.error('Failed to verify Razorpay signature:', err);
    return sendJsonResponse(res, 500, { error: err.message || 'Internal server error while verifying payment signature.' });
  }
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  const pathname = req.url.split('?')[0];

  // Route API requests
  if (req.method === 'POST' && pathname === '/api/create-order') {
    handleCreateOrder(req, res);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/verify-payment') {
    handleVerifyPayment(req, res);
    return;
  }

  // Normalize URL path to prevent directory traversal
  let filePath = '.' + pathname;
  if (filePath === './') {
    filePath = './index.html';
  }

  // Resolve absolute path
  const absolutePath = path.resolve(__dirname, filePath);
  
  // Ensure the target is inside the directory
  if (!absolutePath.startsWith(path.resolve(__dirname))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  const extname = String(path.extname(absolutePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(absolutePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Internal Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/`);
  console.log('Press Ctrl+C to stop the server.');
});
