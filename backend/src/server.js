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

app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

app.use('/api/records', require('./routes/dailyRecords'));
app.use('/api/daily-buying-products', require('./routes/dailyBuyingProducts'));
app.use('/api/purchase-products', require('./routes/purchaseProducts'));
app.use('/api/stock-products', require('./routes/stockProducts'));
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
