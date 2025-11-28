// api/api.js
// Configuration avec fallback pour développement
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Log pour debug
console.log('🔗 API Backend URL:', BASE);

export async function getHealth() {
  try {
    const res = await fetch(`${BASE}/health`);
    if (!res.ok) throw new Error('Health fetch failed');
    return res.json();
  } catch (error) {
    console.error('❌ Health check error:', error);
    throw error;
  }
}

export async function postPredict(formData) {
  try {
    const res = await fetch(`${BASE}/predict`, { 
      method: 'POST', 
      body: formData 
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Predict failed: ${errorText}`);
    }
    return res.json();
  } catch (error) {
    console.error('❌ Prediction error:', error);
    throw error;
  }
}

export async function startRealTime() {
  try {
    const res = await fetch(`${BASE}/real-time/start`, { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}
    });
    return res.json();
  } catch (error) {
    console.error('❌ Start real-time error:', error);
    throw error;
  }
}

export async function stopRealTime() {
  try {
    const res = await fetch(`${BASE}/real-time/stop`, { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}
    });
    return res.json();
  } catch (error) {
    console.error('❌ Stop real-time error:', error);
    throw error;
  }
}

export async function getRealTimeStats() {
  try {
    const res = await fetch(`${BASE}/real-time/stats`);
    if (!res.ok) throw new Error('Real-time stats failed');
    return res.json();
  } catch (error) {
    console.error('❌ Real-time stats error:', error);
    throw error;
  }
}