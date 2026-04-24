import db from '../db.js';
import { hasAnyRankChanged, hasL1Changed, getCurrentL1 } from './ranking.js';

/**
 * Core auction engine: checks whether a newly submitted bid should trigger
 * a time extension, and if so, extends the bid_close_time.
 *
 * Extension logic:
 * 1. Was the bid submitted within the trigger window (last X mins before close)?
 * 2. Does the trigger condition apply?
 *    - 'bid_received': always extends if bid is in window
 *    - 'any_rank_change': extends if any supplier rank changed
 *    - 'l1_rank_change': extends only if the L1 (lowest) bidder changed
 * 3. Extend bid_close_time by Y minutes, capped at forced_close_time
 */
export function checkAndExtend(rfqId, newBidId, previousL1) {
  const rfq = db.prepare('SELECT * FROM rfqs WHERE id = ?').get(rfqId);
  if (!rfq) return { extended: false, reason: 'RFQ not found' };

  const now = new Date();
  const closeTime = new Date(rfq.bid_close_time);
  const forcedClose = new Date(rfq.forced_close_time);
  const triggerWindowMs = rfq.trigger_window_minutes * 60 * 1000;

  // Check if bid was submitted within the trigger window
  const windowStart = new Date(closeTime.getTime() - triggerWindowMs);

  if (now < windowStart || now > closeTime) {
    // Bid is outside the trigger window — no extension
    return { extended: false, reason: 'Bid outside trigger window' };
  }

  // Check trigger condition
  let shouldExtend = false;
  let triggerReason = '';

  switch (rfq.extension_trigger_type) {
    case 'bid_received':
      shouldExtend = true;
      triggerReason = `New bid received within ${rfq.trigger_window_minutes}-minute trigger window`;
      break;

    case 'any_rank_change':
      shouldExtend = hasAnyRankChanged(rfqId, newBidId);
      triggerReason = shouldExtend
        ? `Supplier rank change detected within ${rfq.trigger_window_minutes}-minute trigger window`
        : 'No rank change — extension not triggered';
      break;

    case 'l1_rank_change':
      shouldExtend = hasL1Changed(rfqId, newBidId, previousL1);
      triggerReason = shouldExtend
        ? `L1 (lowest bidder) changed within ${rfq.trigger_window_minutes}-minute trigger window`
        : 'L1 unchanged — extension not triggered';
      break;

    default:
      return { extended: false, reason: `Unknown trigger type: ${rfq.extension_trigger_type}` };
  }

  if (!shouldExtend) {
    return { extended: false, reason: triggerReason };
  }

  // Calculate new close time: current close + Y minutes, capped at forced close
  const extensionMs = rfq.extension_duration_minutes * 60 * 1000;
  let newCloseTime = new Date(closeTime.getTime() + extensionMs);

  if (newCloseTime > forcedClose) {
    newCloseTime = forcedClose;
  }

  // Update the RFQ close time
  db.prepare('UPDATE rfqs SET bid_close_time = ? WHERE id = ?')
    .run(newCloseTime.toISOString(), rfqId);

  // Log the extension
  const oldTimeStr = closeTime.toISOString();
  const newTimeStr = newCloseTime.toISOString();
  db.prepare(`
    INSERT INTO activity_log (rfq_id, event_type, description, created_at)
    VALUES (?, 'time_extended', ?, ?)
  `).run(
    rfqId,
    `Auction extended: ${triggerReason}. Close time moved from ${oldTimeStr} to ${newTimeStr}`,
    now.toISOString()
  );

  return {
    extended: true,
    reason: triggerReason,
    old_close_time: oldTimeStr,
    new_close_time: newTimeStr,
  };
}

/**
 * Update auction statuses based on current time.
 * Called periodically or before listing auctions.
 */
export function updateAuctionStatuses() {
  const now = new Date().toISOString();

  // Upcoming → Active (bid_start_time has passed)
  db.prepare(`
    UPDATE rfqs SET status = 'active'
    WHERE status = 'upcoming' AND bid_start_time <= ?
  `).run(now);

  // Active → Closed (bid_close_time has passed, not yet force closed)
  db.prepare(`
    UPDATE rfqs SET status = 'closed'
    WHERE status = 'active' AND bid_close_time <= ? AND forced_close_time > ?
  `).run(now, now);

  // Active → Force Closed (forced_close_time has passed)
  db.prepare(`
    UPDATE rfqs SET status = 'force_closed'
    WHERE status IN ('active', 'closed') AND forced_close_time <= ?
  `).run(now);

  // Also mark closed ones as force_closed if forced time has passed
  db.prepare(`
    UPDATE rfqs SET status = 'force_closed'
    WHERE status = 'closed' AND forced_close_time <= ?
  `).run(now);
}
