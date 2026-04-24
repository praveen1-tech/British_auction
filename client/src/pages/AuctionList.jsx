import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchRFQs } from '../api';
import { formatDateTime, formatCurrency, getStatusLabel } from '../utils';

export default function AuctionList() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRFQs = async () => {
    try {
      const data = await fetchRFQs();
      setRfqs(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRFQs();
    const interval = setInterval(loadRFQs, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading auctions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card animate-fade-in">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-text">Error: {error}</div>
          <button className="btn btn-primary" onClick={loadRFQs}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">
            <span className="gradient-text">British Auctions</span>
          </h1>
          <p className="page-subtitle">
            {rfqs.length} auction{rfqs.length !== 1 ? 's' : ''} • Real-time competitive bidding
          </p>
        </div>
        <Link to="/create" className="btn btn-primary btn-lg">
          ＋ New RFQ
        </Link>
      </div>

      {rfqs.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">
              No auctions yet. Create your first RFQ to get started.
            </div>
            <Link to="/create" className="btn btn-primary">
              Create RFQ
            </Link>
          </div>
        </div>
      ) : (
        <div className="auction-grid">
          {rfqs.map((rfq) => (
            <Link
              key={rfq.id}
              to={`/auction/${rfq.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className={`glass-card glass-card-clickable auction-card card-${rfq.status} animate-scale-in`}>
                <div className="auction-card-header">
                  <div className="auction-card-name">{rfq.name}</div>
                  <span className={`status-badge status-${rfq.status}`}>
                    {getStatusLabel(rfq.status)}
                  </span>
                </div>

                <div className="auction-card-stats">
                  <div className="auction-stat">
                    <span className="auction-stat-label">Lowest Bid</span>
                    <span className={`auction-stat-value ${rfq.lowest_bid ? 'price' : ''}`}>
                      {rfq.lowest_bid ? formatCurrency(rfq.lowest_bid) : 'No bids'}
                    </span>
                  </div>
                  <div className="auction-stat">
                    <span className="auction-stat-label">Current Close</span>
                    <span className="auction-stat-value">
                      {formatDateTime(rfq.bid_close_time)}
                    </span>
                  </div>
                  <div className="auction-stat">
                    <span className="auction-stat-label">Forced Close</span>
                    <span className="auction-stat-value">
                      {formatDateTime(rfq.forced_close_time)}
                    </span>
                  </div>
                  <div className="auction-stat">
                    <span className="auction-stat-label">Lowest Bidder</span>
                    <span className="auction-stat-value">
                      {rfq.lowest_bidder || '—'}
                    </span>
                  </div>
                </div>

                <div className="auction-card-footer">
                  <span className="bid-count">
                    <strong>{rfq.bid_count}</strong> bid{rfq.bid_count !== 1 ? 's' : ''} placed
                  </span>
                  <span className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                    View Details →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
