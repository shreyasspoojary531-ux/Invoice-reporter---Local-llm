'use client';

import { useState, useEffect, useCallback } from 'react';

type HealthStatus = 'checking' | 'ready' | 'no_model' | 'offline';

export default function HealthIndicator() {
  const [status, setStatus] = useState<HealthStatus>('checking');
  const [details, setDetails] = useState<string>('Checking AI status...');

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        setStatus('offline');
        setDetails('AI service unreachable');
        return;
      }
      const data = await res.json();
      
      const isReady =
        data.status === 'ready' ||
        data.status === 'ok' ||
        data.modelReady === true ||
        (data.running && data.modelAvailable) ||
        (data.ollama && data.model);

      const isNoModel =
        data.status === 'no_model' ||
        (data.running && !data.modelAvailable) ||
        (data.ollama && !data.model) ||
        (data.status === 'ok' && !data.model);

      if (isReady && !isNoModel) {
        setStatus('ready');
        setDetails(data.model ? `Ollama active (${data.model})` : 'AI model ready');
      } else if (isNoModel) {
        setStatus('no_model');
        setDetails('Ollama running, but model not found');
      } else {
        setStatus('offline');
        setDetails(data.error || 'AI service offline');
      }
    } catch {
      setStatus('offline');
      setDetails('Could not connect to Ollama');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <div
      title={details}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200 cursor-default select-none transition-colors"
    >
      <span className="relative flex h-2 w-2">
        {status === 'ready' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            status === 'ready'
              ? 'bg-emerald-500'
              : status === 'no_model'
              ? 'bg-amber-500'
              : status === 'offline'
              ? 'bg-rose-500'
              : 'bg-stone-400 animate-pulse'
          }`}
        />
      </span>
      <span className="whitespace-nowrap">
        {status === 'ready' && 'AI Ready'}
        {status === 'no_model' && 'No Model'}
        {status === 'offline' && 'AI Offline'}
        {status === 'checking' && 'Checking...'}
      </span>
    </div>
  );
}
