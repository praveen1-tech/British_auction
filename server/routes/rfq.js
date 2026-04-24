import { Router } from 'express';
import db from '../db.js';
import { updateAuctionStatuses } from '../engine/auction.js';
import { computeRankings } from '../engine/ranking.js';

const router = Router();

/**
 * POST /api/rfqs — Create a new RFQ with British Auction configuration
 */
router.post('/', (req, res) => {
  try {
    const {
      name,
      bid_start_time,
      bid_close_time,
      forced_close_time,
      pickup_date,
      trigger_window_minutes,
      extension_duration_minutes,
      extension_trigger_type,
    } = req.body;

    // Validation
    if (!name || !bid_start_time || !bid_close_time || !forced_close_time) {
      return res.status(400).json({
        error: 'Missing required fields: name, bid_start_time, bid_close_time, forced_close_time',
      });
    }

    const closeDate = new Date(bid_close_time);
    const forcedDate = new Date(forced_close_time);

    if (forcedDate <= closeDate) {
      return res.status(400).json({
        error: 'Forced Bid Close Time must be later than Bid Close Time',
      });
    }

    const validTriggers = ['bid_received', 'any_rank_change', 'l1_rank_change'];
    if (extension_trigger_type && !validTriggers.includes(extension_trigger_type)) {
      return res.status(400).json({
        error: `Invalid extension_trigger_type. Must be one of: ${validTriggers.join(', ')}`,
      });
    }

    // Determine initial status
    const now = new Date();
    const startDate = new Date(bid_start_time);
    let status = 'upcoming';
    if (now >= startDate && now < closeDate) {
      status = 'active';
    } else if (now >= closeDate && now < forcedDate) {
      status = 'closed';
    } else if (now >= forcedDate) {
      status = 'force_closed';
    }

    const stmt = db.prepare(`
      INSERT INTO rfqs (name, bid_start_time, bid_close_time, original_close_time, forced_close_time,
                         pickup_date, trigger_window_minutes, extension_duration_minutes,
                         extension_trigger_type, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      new Date(bid_start_time).toISOString(),
      closeDate.toISOString(),
      closeDate.toISOString(), // original_close_time = bid_close_time at creation
      forcedDate.toISOString(),
      pickup_date || null,
      trigger_window_minutes || 10,
      extension_duration_minutes || 5,
      extension_trigger_type || 'bid_received',
      status,
      now.toISOString()
    );

    // Log creation
    db.prepare(`
      INSERT INTO activity_log (rfq_id, event_type, description, created_at)
      VALUES (?, 'rfq_created', ?, ?)
    `).run(result.lastInsertRowid, `RFQ "${name}" created`, now.toISOString());

    const rfq = db.prepare('SELECT * FROM rfqs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(rfq);
  } catch (err) {
    console.error('Error creating RFQ:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/rfqs — List all RFQs with computed status and lowest bid
 */
router.get('/', (req, res) => {
  try {
    // Update statuses first
    updateAuctionStatuses();

    const rfqs = db.prepare('SELECT * FROM rfqs ORDER BY created_at DESC').all();

    // Enrich with lowest bid info
    const enriched = rfqs.map(rfq => {
      const lowestBid = db.prepare(`
        SELECT carrier_name, total_price FROM bids
        WHERE rfq_id = ?
        ORDER BY total_price ASC
        LIMIT 1
      `).get(rfq.id);

      const bidCount = db.prepare('SELECT COUNT(*) as count FROM bids WHERE rfq_id = ?').get(rfq.id);

      return {
        ...rfq,
        lowest_bid: lowestBid ? lowestBid.total_price : null,
        lowest_bidder: lowestBid ? lowestBid.carrier_name : null,
        bid_count: bidCount.count,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Error listing RFQs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/rfqs/:id — Full RFQ details with bids, rankings, and activity log
 */
router.get('/:id', (req, res) => {
  try {
    // Update statuses first
    updateAuctionStatuses();

    const rfq = db.prepare('SELECT * FROM rfqs WHERE id = ?').get(req.params.id);
    if (!rfq) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    const rankedBids = computeRankings(rfq.id);
    const activityLog = db.prepare(`
      SELECT * FROM activity_log WHERE rfq_id = ? ORDER BY created_at DESC
    `).all(rfq.id);

    res.json({
      ...rfq,
      bids: rankedBids,
      activity_log: activityLog,
    });
  } catch (err) {
    console.error('Error fetching RFQ details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
