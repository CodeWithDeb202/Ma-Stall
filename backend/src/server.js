const connectDatabase = require('./config/database');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(helmet());


const allowedOrigins = [
  'http://localhost:3000',
  'https://ma-stall.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));


app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());


const authRateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
};

// Strict limit for login, registration, and admin verification.
const loginRateLimit = rateLimit({
  ...authRateLimitOptions,
  limit: 10,
});

// Session checks are frequent during dashboard navigation,
// so give this endpoint its own higher limit.
const sessionRateLimit = rateLimit({
  ...authRateLimitOptions,
  limit: 120,
});

// Apply strict limits only to sensitive authentication endpoints.
app.use('/api/auth/login', loginRateLimit);
app.use('/api/auth/register', loginRateLimit);
app.use('/api/auth/verify', loginRateLimit);

// Session checks have a separate limit.
app.use('/api/auth/session', sessionRateLimit);

app.use('/api/auth', require('./routes/auth'));


app.use('/api/records', require('./routes/dailyRecords'));
app.use('/api/daily-investment-dividing', require('./routes/dailyInvestmentDividing'));
app.use('/api/daily-buying-products', require('./routes/dailyBuyingProducts'));
app.use('/api/purchase-products', require('./routes/purchaseProducts'));
app.use('/api/stock-products', require('./routes/stockProducts'));
app.use('/api/menu-items', require('./routes/menuItems'));
app.use('/api/daily-buying-payments', require('./routes/dailyBuyingProfitPayments'));
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Ma Stall API is running' });
});

const PORT = process.env.PORT || 5000;

connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Ma Stall API running on http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error("Failed to connect to MongoDB:", error.message);
  process.exit(1);
});

app.use('/api/selling-products', require('./routes/sellingProducts'));
