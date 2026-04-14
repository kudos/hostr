import { useEffect, useRef } from 'react';

export function useReconnectingWebSocket(url, onMessage) {
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    if (!url) return;
    let stopped = false;
    let ws;
    let interval = 5000;
    const maxInterval = 5 * 60 * 1000;

    function connect() {
      ws = new WebSocket(url);

      ws.onopen = () => {
        interval = 5000;
        ws.send(JSON.stringify({ authorization: window.user.token }));
      };

      ws.onmessage = (msg) => {
        try {
          const { type, data } = JSON.parse(msg.data);
          cbRef.current(type, data);
        } catch {}
      };

      ws.onclose = () => {
        if (stopped) return;
        const delay = interval * (1 + Math.random());
        setTimeout(connect, delay);
        interval = Math.min(interval * 2, maxInterval);
      };
    }

    connect();
    return () => {
      stopped = true;
      ws?.close();
    };
  }, [url]);
}
