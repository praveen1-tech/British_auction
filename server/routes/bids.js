import { Router } from 'express';
import db from '../db.js';
import { checkAndExtend, updateAuctionStatuses } from '../engine/auction.js';
import { getCurrentL1 } from '../engine/ranking.js';

const router = Router();

/**
 * POST /api/rfqs/:id/bids — Submit a bid for an RFQ
 * Triggers auction extension logic if applicable
 */
router.post('/:id/bids', (req, res) => {
  try {
    const rfqId = parseInt(req.params.id);

    // Update statuses before checking
    updateAuctionStatuses();

    const rfq = db.prepare('SELECT * FROM rfqs WHERE id = ?').get(rfqId);
    if (!rfq) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    if (rfq.status !== 'active') {
      return res.status(400).json({
        error: `Cannot submit bids — auction status is "${rfq.status}". Only active auctions accept bids.`,
      });
    }

    const {
      carrier_name,
      freight_charges,
      origin_charges,
      destination_charges,
      transit_time,
      quote_validity,
    } = req.body;

    // Validation
    if (!carrier_name) {
      return res.status(400).json({ error: 'carrier_name is required' });
    }

    const freight = parseFloat(freight_charges) || 0;
    const origin = parseFloat(origin_charges) || 0;
    const destination = parseFloat(destination_charges) || 0;
    const totalPrice = freight + origin + destination;

    if (totalPrice <= 0) {
      return res.status(400).json({ error: 'Total price must be greater than 0' });
    }

    // Capture L1 before insertion (for L1 change detection)
    const previousL1 = getCurrentL1(rfqId);

    const now = new Date().toISOString();

    // Insert the bid
    const result = db.prepare(`
      INSERT INTO bids (rfq_id, carrier_name, freight_charges, origin_charges,
                         destination_charges, total_price, transit_time, quote_validity, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(rfqId, carrier_name, freight, origin, destination, totalPrice,
           transit_time || null, quote_validity || null, now);

    const newBidId = result.lastInsertRowid;

    // Log bid submission
    db.prepare(`
      INSERT INTO activity_log (rfq_id, event_type, description, created_at)
      VALUES (?, 'bid_submitted', ?, ?)
    `).run(rfqId, `Bid submitted by ${carrier_name}: $${totalPrice.toFixed(2)}`, now);

    // Run auction extension engine
    const extensionResult = checkAndExtend(rfqId, newBidId, previousL1);

    // Get the fresh bid with computed data
    const bid = db.prepare('SELECT * FROM bids WHERE id = ?').get(newBidId);

    res.status(201).json({
      bid,
      extension: extensionResult,
    });
  } catch (err) {
    console.error('Error submitting bid:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
