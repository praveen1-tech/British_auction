import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRFQ } from '../api';

export default function CreateRFQ() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set default times: start = now, close = +2 hours, forced = +3 hours
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const toLocalISOString = (date) => {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    name: '',
    bid_start_time: toLocalISOString(now),
    bid_close_time: toLocalISOString(twoHoursLater),
    forced_close_time: toLocalISOString(threeHoursLater),
    pickup_date: toLocalISOString(oneWeekLater).slice(0, 10),
    trigger_window_minutes: 10,
    extension_duration_minutes: 5,
    extension_trigger_type: 'bid_received',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'RFQ Name is required';
    if (!form.bid_start_time) return 'Bid Start Time is required';
    if (!form.bid_close_time) return 'Bid Close Time is required';
    if (!form.forced_close_time) return 'Forced Bid Close Time is required';

    const close = new Date(form.bid_close_time);
    const forced = new Date(form.forced_close_time);

    if (forced <= close) {
      return 'Forced Bid Close Time must be later than Bid Close Time';
    }

    if (form.trigger_window_minutes < 1) {
      return 'Trigger Window must be at least 1 minute';
    }

    if (form.extension_duration_minutes < 1) {
      return 'Extension Duration must be at least 1 minute';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const rfq = await createRFQ({
        ...form,
        bid_start_time: new Date(form.bid_start_time).toISOString(),
        bid_close_time: new Date(form.bid_close_time).toISOString(),
        forced_close_time: new Date(form.forced_close_time).toISOString(),
        trigger_window_minutes: parseInt(form.trigger_window_minutes),
        extension_duration_minutes: parseInt(form.extension_duration_minutes),
      });
      navigate(`/auction/${rfq.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">
          Create <span className="gradient-text">New RFQ</span>
        </h1>
        <p className="page-subtitle">
          Set up a new Request for Quotation with British Auction bidding
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h2 className="section-title">📋 RFQ Details</h2>

          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" htmlFor="rfq-name">RFQ Name / Reference ID</label>
              <input
                id="rfq-name"
                className="form-input"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g., RFQ-2026-001 — International Freight Shipment"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bid-start">Bid Start Date & Time</label>
              <input
                id="bid-start"
                className="form-input"
                type="datetime-local"
                name="bid_start_time"
                value={form.bid_start_time}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bid-close">Bid Close Date & Time</label>
              <input
                id="bid-close"
                className="form-input"
                type="datetime-local"
                name="bid_close_time"
                value={form.bid_close_time}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="forced-close">Forced Bid Close Date & Time</label>
              <input
                id="forced-close"
                className="form-input"
                type="datetime-local"
                name="forced_close_time"
                value={form.forced_close_time}
                onChange={handleChange}
                required
              />
              <div className="form-hint">Must be later than Bid Close Time. Auction cannot extend beyond this.</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pickup-date">Pickup / Service Date</label>
              <input
                id="pickup-date"
                className="form-input"
                type="date"
                name="pickup_date"
                value={form.pickup_date}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h2 className="section-title">⚙️ British Auction Configuration</h2>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="trigger-window">Trigger Window (X Minutes)</label>
              <input
                id="trigger-window"
                className="form-input"
                type="number"
                name="trigger_window_minutes"
                value={form.trigger_window_minutes}
                onChange={handleChange}
                min="1"
                required
              />
              <div className="form-hint">How close to the auction end to monitor bidding activity</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="extension-duration">Extension Duration (Y Minutes)</label>
              <input
                id="extension-duration"
                className="form-input"
                type="number"
                name="extension_duration_minutes"
                value={form.extension_duration_minutes}
                onChange={handleChange}
                min="1"
                required
              />
              <div className="form-hint">Extra time added when a trigger condition occurs</div>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" htmlFor="trigger-type">Extension Trigger Type</label>
              <select
                id="trigger-type"
                className="form-select"
                name="extension_trigger_type"
                value={form.extension_trigger_type}
                onChange={handleChange}
              >
                <option value="bid_received">Bid Received in Last X Minutes</option>
                <option value="any_rank_change">Any Supplier Rank Change in Last X Minutes</option>
                <option value="l1_rank_change">Lowest Bidder (L1) Rank Change in Last X Minutes</option>
              </select>
              <div className="form-hint">
                {form.extension_trigger_type === 'bid_received' &&
                  'The auction extends whenever any new bid is submitted within the trigger window.'}
                {form.extension_trigger_type === 'any_rank_change' &&
                  'The auction extends when any change in supplier ranking occurs within the trigger window.'}
                {form.extension_trigger_type === 'l1_rank_change' &&
                  'The auction extends only when the lowest-priced supplier (L1) changes within the trigger window.'}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="extension-alert" style={{ marginBottom: 'var(--space-lg)' }}>
            <span className="extension-alert-icon">⚠️</span>
            <span className="extension-alert-text">{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-success btn-lg"
            disabled={loading}
          >
            {loading ? 'Creating...' : '🚀 Create RFQ & Start Auction'}
          </button>
        </div>
      </form>
    </div>
  );
}
