export type WSHandlers = {
  onMessage: (evt: MessageEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (evt: Event) => void;
};

export function connectWS(sessionId: string, handlers: WSHandlers): WebSocket {
  const ws = new WebSocket(`ws://localhost:8000/ws/session/${sessionId}`);

  ws.onmessage = handlers.onMessage;

  ws.onopen = () => {
    console.log("WS connected:", sessionId);
    if (handlers.onOpen) handlers.onOpen();
  };

  ws.onclose = () => {
    console.log("WS closed:", sessionId);
    if (handlers.onClose) handlers.onClose();
  };

  ws.onerror = (evt) => {
    console.error("WS error:", evt);
    if (handlers.onError) handlers.onError(evt);
  };

  return ws;
}
