import db from '../db.js';

/**
 * Compute rankings for all bids in an RFQ.
 * Returns bids sorted by total_price ascending, with rank labels (L1, L2, L3…).
 */
export function computeRankings(rfqId) {
  const bids = db.prepare(`
    SELECT * FROM bids WHERE rfq_id = ? ORDER BY total_price ASC, submitted_at ASC
  `).all(rfqId);

  return bids.map((bid, index) => ({
    ...bid,
    rank: index + 1,
    rank_label: `L${index + 1}`,
  }));
}

/**
 * Get the current L1 (lowest price) carrier name before a new bid.
 */
export function getCurrentL1(rfqId) {
  const row = db.prepare(`
    SELECT carrier_name, total_price FROM bids
    WHERE rfq_id = ?
    ORDER BY total_price ASC, submitted_at ASC
    LIMIT 1
  `).get(rfqId);

  return row || null;
}

/**
 * Check if any supplier rank changed after inserting a new bid.
 * We compare rankings before (excluding the new bid) and after (including it).
 */
export function hasAnyRankChanged(rfqId, newBidId) {
  // Get rankings including the new bid
  const allBids = db.prepare(`
    SELECT id, carrier_name, total_price FROM bids
    WHERE rfq_id = ?
    ORDER BY total_price ASC, submitted_at ASC
  `).all(rfqId);

  // Get rankings excluding the new bid
  const oldBids = allBids.filter(b => b.id !== newBidId);

  // If this is the first bid, there's no rank change
  if (oldBids.length === 0) return false;

  // Compare: did any existing carrier's position change?
  const oldRankMap = {};
  oldBids.forEach((b, i) => { oldRankMap[b.carrier_name] = i; });

  const newRankMap = {};
  allBids.forEach((b, i) => { newRankMap[b.carrier_name] = i; });

  for (const carrier of Object.keys(oldRankMap)) {
    if (oldRankMap[carrier] !== newRankMap[carrier]) {
      return true;
    }
  }

  return false;
}

/**
 * Check if the L1 (lowest bidder) changed after inserting a new bid.
 */
export function hasL1Changed(rfqId, newBidId, previousL1) {
  if (!previousL1) return false; // First bid — no L1 change

  const currentL1 = getCurrentL1(rfqId);
  if (!currentL1) return false;

  // L1 changed if a different carrier is now the lowest
  return currentL1.carrier_name !== previousL1.carrier_name;
}
