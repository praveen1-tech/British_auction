import express from 'express';
import cors from 'cors';
import rfqRoutes from './routes/rfq.js';
import bidRoutes from './routes/bids.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/rfqs', rfqRoutes);
app.use('/api/rfqs', bidRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 British Auction Server running on http://localhost:${PORT}`);
});
