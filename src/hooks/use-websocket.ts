'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import api from '@/lib/api';

type WebSocketEvent = {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
  type?: string;
};

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Reconnect on disconnect (default: true) */
  reconnect?: boolean;
  /** Max reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Reconnect interval in ms (default: 3000) */
  reconnectInterval?: number;
  /** Event handlers map */
  onEvent?: Record<string, (data: Record<string, unknown>) => void>;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 3000,
    onEvent,
  } = options;

  const { getToken, userId } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onEventRef = useRef(onEvent);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);

  // Keep onEvent ref current without causing reconnects
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect on intentional close
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connectRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (!userId) return;

    cleanup();
    setStatus('connecting');

    try {
      const token = await getToken();
      const wsUrl = `${api.wsUrl}?userId=${userId}&token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Start keepalive ping every 30s
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const parsed: WebSocketEvent = JSON.parse(event.data);
          // Skip pong responses
          if (parsed.type === 'pong') return;

          setLastEvent(parsed);

          // Call specific event handler if registered
          if (parsed.event && onEventRef.current?.[parsed.event]) {
            onEventRef.current[parsed.event](parsed.data);
          }

          // Call wildcard handler if registered
          if (onEventRef.current?.['*']) {
            onEventRef.current['*'](parsed as unknown as Record<string, unknown>);
          }
        } catch {
          // Ignore non-JSON messages
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Auto-reconnect
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1);
          reconnectTimerRef.current = setTimeout(() => {
            connectRef.current?.();
          }, Math.min(delay, 15000));
        }
      };

      ws.onerror = () => {
        setStatus('error');
      };
    } catch (error) {
      console.error('[useWebSocket] Connection error:', error);
      setStatus('error');
    }
  }, [userId, getToken, cleanup, reconnect, maxReconnectAttempts, reconnectInterval]);

  // Keep connectRef in sync
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
    cleanup();
    setStatus('disconnected');
  }, [cleanup, maxReconnectAttempts]);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Auto-connect on mount (deferred to avoid cascading renders)
  useEffect(() => {
    if (autoConnect && userId) {
      const timer = setTimeout(() => connect(), 0);
      return () => {
        clearTimeout(timer);
        cleanup();
      };
    }
    return () => {
      cleanup();
    };
  }, [autoConnect, userId, connect, cleanup]);

  return {
    status,
    lastEvent,
    connect,
    disconnect,
    send,
    isConnected: status === 'connected',
  };
}
