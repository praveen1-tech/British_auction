const API_BASE = 'http://localhost:3001/api';

export async function fetchRFQs() {
  const res = await fetch(`${API_BASE}/rfqs`);
  if (!res.ok) throw new Error('Failed to fetch RFQs');
  return res.json();
}

export async function fetchRFQ(id) {
  const res = await fetch(`${API_BASE}/rfqs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch RFQ details');
  return res.json();
}

export async function createRFQ(data) {
  const res = await fetch(`${API_BASE}/rfqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create RFQ');
  return json;
}

export async function submitBid(rfqId, data) {
  const res = await fetch(`${API_BASE}/rfqs/${rfqId}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to submit bid');
  return json;
}
