// hooks/useBackendStatus.js
import { useState, useEffect, useRef } from 'react';
import { getHealth } from '../Api/api';

export default function useBackendStatus(pollInterval = 30000) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  const [meta, setMeta] = useState({});
  const mounted = useRef(true);

  async function check() {
    try {
      const data = await getHealth();
      if (!mounted.current) return;
      if (data.status === 'OK') {
        setStatus('online');
        setMeta(data);
      } else {
        setStatus('offline');
      }
    } catch (err) {
      if (!mounted.current) return;
      setStatus('offline');
    }
  }

  useEffect(() => {
    check();
    const id = setInterval(check, pollInterval);
    return () => { mounted.current = false; clearInterval(id); };
  }, [pollInterval]);

  return { status, meta, setStatus, refresh: check };
}
