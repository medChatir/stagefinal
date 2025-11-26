// api/api.js
const BASE = 'http://localhost:5173';

export async function getHealth() {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error('Health fetch failed');
  return res.json();
}

export async function postPredict(formData) {
  const res = await fetch(`${BASE}/predict`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Predict failed');
  return res.json();
}

export async function startRealTime() {
  const res = await fetch(`${BASE}/real-time/start`, { method: 'POST', headers:{'Content-Type':'application/json'}});
  return res.json();
}

export async function stopRealTime() {
  const res = await fetch(`${BASE}/real-time/stop`, { method: 'POST', headers:{'Content-Type':'application/json'}});
  return res.json();
}

export async function getRealTimeStats() {
  const res = await fetch(`${BASE}/real-time/stats`);
  if (!res.ok) throw new Error('Real-time stats failed');
  return res.json();
}
