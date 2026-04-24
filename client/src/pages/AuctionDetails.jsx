import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchRFQ, submitBid } from '../api';
import {
  formatDateTime,
  formatCurrency,
  getTimeRemaining,
  getStatusLabel,
  getTriggerLabel,
  getEventIcon,
  getEventClass,
  pad2,
} from '../utils';

export default function AuctionDetails() {
  const { id } = useParams();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [bidError, setBidError] = useState(null);
  const [bidSuccess, setBidSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [extensionAlert, setExtensionAlert] = useState(null);

  const [bidForm, setBidForm] = useState({
    carrier_name: '',
    freight_charges: '',
    origin_charges: '',
    destination_charges: '',
    transit_time: '',
    quote_validity: '',
  });

  const loadRFQ = useCallback(async () => {
    try {
      const data = await fetchRFQ(id);
      setRfq(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Poll for updates
  useEffect(() => {
    loadRFQ();
    const interval = setInterval(loadRFQ, 5000);
    return () => clearInterval(interval);
  }, [loadRFQ]);

  // Countdown timer
  useEffect(() => {
    if (!rfq) return;

    const updateCountdown = () => {
      if (rfq.status === 'active') {
        setCountdown(getTimeRemaining(rfq.bid_close_time));
      } else if (rfq.status === 'upcoming') {
        setCountdown(getTimeRemaining(rfq.bid_start_time));
      } else {
        setCountdown(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [rfq]);

  const handleBidChange = (e) => {
    const { name, value } = e.target;
    setBidForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setBidError(null);
    setBidSuccess(null);
    setExtensionAlert(null);

    if (!bidForm.carrier_name.trim()) {
      setBidError('Carrier Name is required');
      return;
    }

    const total =
      (parseFloat(bidForm.freight_charges) || 0) +
      (parseFloat(bidForm.origin_charges) || 0) +
      (parseFloat(bidForm.destination_charges) || 0);

    if (total <= 0) {
      setBidError('Total charges must be greater than $0');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitBid(id, bidForm);
      setBidSuccess(`Bid submitted successfully! Total: ${formatCurrency(result.bid.total_price)}`);

      if (result.extension && result.extension.extended) {
        setExtensionAlert(result.extension.reason);
      }

      // Reset form
      setBidForm({
        carrier_name: '',
        freight_charges: '',
        origin_charges: '',
        destination_charges: '',
        transit_time: '',
        quote_validity: '',
      });

      // Refresh data
      await loadRFQ();

      // Auto-dismiss success message
      setTimeout(() => setBidSuccess(null), 5000);
    } catch (err) {
      setBidError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading auction details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card animate-fade-in">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-text">Error: {error}</div>
          <Link to="/" className="btn btn-primary">Back to Auctions</Link>
        </div>
      </div>
    );
  }

  if (!rfq) return null;

  const isActive = rfq.status === 'active';
  const isUrgent = countdown && countdown.total < 5 * 60 * 1000 && !countdown.expired;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to="/" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'inline-block' }}>
            ← Back to Auctions
          </Link>
          <h1 className="page-title">{rfq.name}</h1>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <span className={`status-badge status-${rfq.status}`}>
              {getStatusLabel(rfq.status)}
            </span>
            <span>ID: {rfq.id}</span>
          </p>
        </div>
      </div>

      {/* Extension Alert */}
      {extensionAlert && (
        <div className="extension-alert">
          <span className="extension-alert-icon">⏰</span>
          <span className="extension-alert-text">
            Time Extended! {extensionAlert}
          </span>
        </div>
      )}

      <div className="detail-layout">
        {/* Main Content */}
        <div>
          {/* Countdown Timer */}
          {countdown && !countdown.expired && (
            <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="countdown-container">
                <div className="countdown-label">
                  {rfq.status === 'upcoming' ? 'Auction Starts In' : 'Time Remaining'}
                </div>
                <div className="countdown-timer">
                  {countdown.days > 0 && (
                    <>
                      <div className="countdown-segment">
                        <span className={`countdown-value ${isUrgent ? 'urgent' : ''}`}>
                          {pad2(countdown.days)}
                        </span>
                        <span className="countdown-unit">Days</span>
                      </div>
                      <span className="countdown-separator">:</span>
                    </>
                  )}
                  <div className="countdown-segment">
                    <span className={`countdown-value ${isUrgent ? 'urgent' : ''}`}>
                      {pad2(countdown.hours)}
                    </span>
                    <span className="countdown-unit">Hours</span>
                  </div>
                  <span className="countdown-separator">:</span>
                  <div className="countdown-segment">
                    <span className={`countdown-value ${isUrgent ? 'urgent' : ''}`}>
                      {pad2(countdown.minutes)}
                    </span>
                    <span className="countdown-unit">Min</span>
                  </div>
                  <span className="countdown-separator">:</span>
                  <div className="countdown-segment">
                    <span className={`countdown-value ${isUrgent ? 'urgent' : ''}`}>
                      {pad2(countdown.seconds)}
                    </span>
                    <span className="countdown-unit">Sec</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bids Table */}
          <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h2 className="section-title">📊 Supplier Bids & Rankings</h2>
            {rfq.bids && rfq.bids.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Carrier</th>
                      <th>Freight</th>
                      <th>Origin</th>
                      <th>Destination</th>
                      <th>Total Price</th>
                      <th>Transit Time</th>
                      <th>Validity</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfq.bids.map((bid) => {
                      let rankClass = 'rank-default';
                      if (bid.rank === 1) rankClass = 'rank-l1';
                      else if (bid.rank === 2) rankClass = 'rank-l2';
                      else if (bid.rank === 3) rankClass = 'rank-l3';

                      return (
                        <tr key={bid.id}>
                          <td>
                            <span className={`rank-badge ${rankClass}`}>
                              {bid.rank_label}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-bright)' }}>
                            {bid.carrier_name}
                          </td>
                          <td>{formatCurrency(bid.freight_charges)}</td>
                          <td>{formatCurrency(bid.origin_charges)}</td>
                          <td>{formatCurrency(bid.destination_charges)}</td>
                          <td style={{ fontWeight: 700, color: bid.rank === 1 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                            {formatCurrency(bid.total_price)}
                          </td>
                          <td>{bid.transit_time || '—'}</td>
                          <td>{bid.quote_validity || '—'}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {formatDateTime(bid.submitted_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                <div className="empty-state-icon">💰</div>
                <div className="empty-state-text">No bids yet. Be the first to submit a quote!</div>
              </div>
            )}
          </div>

          {/* Bid Submission Form */}
          {isActive && (
            <div className="glass-card bid-form-container" style={{ marginBottom: 'var(--space-lg)' }}>
              <h2 className="section-title">📝 Submit a Quote</h2>

              {bidSuccess && (
                <div className="toast toast-success" style={{ position: 'relative', bottom: 'auto', right: 'auto', marginBottom: 'var(--space-md)' }}>
                  ✅ {bidSuccess}
                </div>
              )}

              {bidError && (
                <div className="extension-alert" style={{ marginBottom: 'var(--space-md)' }}>
                  <span className="extension-alert-icon">⚠️</span>
                  <span className="extension-alert-text">{bidError}</span>
                </div>
              )}

              <form onSubmit={handleBidSubmit}>
                <div className="bid-form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="carrier-name">Carrier Name *</label>
                    <input
                      id="carrier-name"
                      className="form-input"
                      type="text"
                      name="carrier_name"
                      value={bidForm.carrier_name}
                      onChange={handleBidChange}
                      placeholder="e.g., Express Logistics Co."
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="freight-charges">Freight Charges ($)</label>
                    <input
                      id="freight-charges"
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      name="freight_charges"
                      value={bidForm.freight_charges}
                      onChange={handleBidChange}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="origin-charges">Origin Charges ($)</label>
                    <input
                      id="origin-charges"
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      name="origin_charges"
                      value={bidForm.origin_charges}
                      onChange={handleBidChange}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="dest-charges">Destination Charges ($)</label>
                    <input
                      id="dest-charges"
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      name="destination_charges"
                      value={bidForm.destination_charges}
                      onChange={handleBidChange}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="transit-time">Transit Time</label>
                    <input
                      id="transit-time"
                      className="form-input"
                      type="text"
                      name="transit_time"
                      value={bidForm.transit_time}
                      onChange={handleBidChange}
                      placeholder="e.g., 3-5 days"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="quote-validity">Quote Validity</label>
                    <input
                      id="quote-validity"
                      className="form-input"
                      type="text"
                      name="quote_validity"
                      value={bidForm.quote_validity}
                      onChange={handleBidChange}
                      placeholder="e.g., 30 days"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-md)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Total: <strong style={{ color: 'var(--accent-green)', fontSize: '1.1rem' }}>
                      {formatCurrency(
                        (parseFloat(bidForm.freight_charges) || 0) +
                        (parseFloat(bidForm.origin_charges) || 0) +
                        (parseFloat(bidForm.destination_charges) || 0)
                      )}
                    </strong>
                  </span>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : '💰 Submit Bid'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {/* Auction Config */}
          <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h2 className="section-title">⚙️ Auction Config</h2>
            <div className="config-grid">
              <div className="config-item">
                <div className="config-label">Trigger Window</div>
                <div className="config-value">{rfq.trigger_window_minutes} min</div>
              </div>
              <div className="config-item">
                <div className="config-label">Extension</div>
                <div className="config-value">{rfq.extension_duration_minutes} min</div>
              </div>
              <div className="config-item" style={{ gridColumn: '1 / -1' }}>
                <div className="config-label">Trigger Type</div>
                <div className="config-value" style={{ fontSize: '0.85rem' }}>
                  {getTriggerLabel(rfq.extension_trigger_type)}
                </div>
              </div>
            </div>
          </div>

          {/* Time Details */}
          <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h2 className="section-title">🕑 Time Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="config-item">
                <div className="config-label">Bid Start</div>
                <div className="config-value" style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  {formatDateTime(rfq.bid_start_time)}
                </div>
              </div>
              <div className="config-item">
                <div className="config-label">Original Close</div>
                <div className="config-value" style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  {formatDateTime(rfq.original_close_time)}
                </div>
              </div>
              <div className="config-item">
                <div className="config-label">Current Close</div>
                <div className="config-value" style={{ fontSize: '0.82rem' }}>
                  {formatDateTime(rfq.bid_close_time)}
                </div>
              </div>
              <div className="config-item" style={{ borderColor: 'rgba(255, 68, 102, 0.3)' }}>
                <div className="config-label" style={{ color: 'var(--accent-red)' }}>Forced Close</div>
                <div className="config-value" style={{ fontSize: '0.82rem', color: 'var(--accent-red)' }}>
                  {formatDateTime(rfq.forced_close_time)}
                </div>
              </div>
              {rfq.pickup_date && (
                <div className="config-item">
                  <div className="config-label">Pickup / Service Date</div>
                  <div className="config-value" style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {formatDateTime(rfq.pickup_date)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="glass-card">
            <h2 className="section-title">📜 Activity Log</h2>
            {rfq.activity_log && rfq.activity_log.length > 0 ? (
              <div className="activity-log">
                {rfq.activity_log.map((entry) => (
                  <div key={entry.id} className="activity-item">
                    <div className={`activity-icon ${getEventClass(entry.event_type)}`}>
                      {getEventIcon(entry.event_type)}
                    </div>
                    <div className="activity-content">
                      <div className="activity-description">{entry.description}</div>
                      <div className="activity-time">{formatDateTime(entry.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No activity yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
