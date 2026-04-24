/**
 * Format ISO date string to a human-readable local format
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format ISO date string to short time (HH:MM)
 */
export function formatTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get time remaining from now until a target date.
 * Returns { days, hours, minutes, seconds, total, expired }
 */
export function getTimeRemaining(targetDate) {
  const total = new Date(targetDate).getTime() - Date.now();
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, expired: true };
  }
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
    expired: false,
  };
}

/**
 * Get status display label
 */
export function getStatusLabel(status) {
  const labels = {
    upcoming: 'Upcoming',
    active: 'Active',
    closed: 'Closed',
    force_closed: 'Force Closed',
  };
  return labels[status] || status;
}

/**
 * Get trigger type display label
 */
export function getTriggerLabel(type) {
  const labels = {
    bid_received: 'Bid Received in Window',
    any_rank_change: 'Any Rank Change',
    l1_rank_change: 'L1 (Lowest Bidder) Change',
  };
  return labels[type] || type;
}

/**
 * Get event type icon emoji
 */
export function getEventIcon(eventType) {
  const icons = {
    bid_submitted: '💰',
    time_extended: '⏰',
    auction_closed: '🔒',
    auction_force_closed: '⛔',
    rfq_created: '✨',
  };
  return icons[eventType] || '📝';
}

/**
 * Get event type CSS class
 */
export function getEventClass(eventType) {
  const classes = {
    bid_submitted: 'bid',
    time_extended: 'extension',
    auction_closed: 'closed',
    auction_force_closed: 'closed',
    rfq_created: 'created',
  };
  return classes[eventType] || 'bid';
}

/**
 * Pad a number to 2 digits
 */
export function pad2(n) {
  return String(n).padStart(2, '0');
}
