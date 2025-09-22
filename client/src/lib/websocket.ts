import { useEffect, useRef } from 'react';

interface WebSocketConfig {
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(config: WebSocketConfig = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
        config.onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          config.onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        config.onDisconnect?.();
        
        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connect();
          }, reconnectDelay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        config.onError?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const send = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  const subscribe = (channel: string) => {
    send({ channel });
  };

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  return {
    send,
    subscribe,
    disconnect,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}
