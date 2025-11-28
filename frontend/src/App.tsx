import React, { useEffect, useRef, useState } from "react";
import { connectWS } from "./services/socket";
import GraphCanvas from "./components/GraphCanvas";

type LinkT = { source: string; target: string; similarity: number };
type UpdatePayload = {
  node: { id: string; session_id: string; user: string; text: string };
  links: LinkT[];
};

function App(): JSX.Element {
  const [updates, setUpdates] = useState<UpdatePayload[]>([]);
  const [sessionId, setSessionId] = useState<string>("demo-session");
  const [user, setUser] = useState<string>(
    "user-" + Math.random().toString(36).slice(2, 6)
  );

  const wsRef = useRef<WebSocket | null>(null);
  const [wsReady, setWsReady] = useState<boolean>(false);

  useEffect(() => {
    // 새 sessionId마다 WebSocket 재연결
    const ws = connectWS(sessionId, {
      onMessage: (evt: MessageEvent) => {
        const data = JSON.parse(evt.data);
        if (data.type === "graph_update") {
          setUpdates((prev: UpdatePayload[]) => [
            ...prev,
            data.payload as UpdatePayload,
          ]);
        }
      },
      onOpen: () => {
        console.log("WS open for session:", sessionId);
        setWsReady(true);
      },
      onClose: () => {
        console.log("WS closed for session:", sessionId);
        setWsReady(false);
      },
      onError: () => {
        setWsReady(false);
      },
    });

    wsRef.current = ws;

    return () => {
      // StrictMode에서 effect가 두 번 도는 걸 감안해서,
      // cleanup 시 이전 소켓만 안전하게 닫아줌
      try {
        ws.close();
      } catch {
        // ignore
      }
    };
  }, [sessionId]);

const sendUtterance = (text: string) => {
  const ws = wsRef.current;

  if (!ws) {
    console.warn("WS not created yet");
    return;
  }

  if (ws.readyState !== WebSocket.OPEN) {
    console.warn("WS not open. readyState =", ws.readyState);
    return;
  }

  ws.send(JSON.stringify({
    type: "utterance",
    user,
    text,
  }));
};


  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        height: "100vh",
      }}
    >
      <aside style={{ padding: 16, borderRight: "1px solid #eee" }}>
        <h3>MindMesh MVP</h3>

        <label style={{ display: "block", marginBottom: 8 }}>
          <div>Session ID</div>
          <input
            value={sessionId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSessionId(e.target.value)
            }
            style={{ width: "100%" }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          <div>User</div>
          <input
            value={user}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUser(e.target.value)
            }
            style={{ width: "100%" }}
          />
        </label>

        <Composer onSend={sendUtterance} wsReady={wsReady} />

        <p style={{ fontSize: 12, color: "#666", marginTop: 16 }}>
          WebSocket 상태:{" "}
          <b style={{ color: wsReady ? "green" : "red" }}>
            {wsReady ? "연결됨" : "연결 안 됨"}
          </b>
        </p>
      </aside>

      <main>
        <GraphCanvas updates={updates} />
      </main>
    </div>
  );
}

type ComposerProps = {
  onSend: (text: string) => void;
  wsReady: boolean;
};

function Composer({ onSend, wsReady }: ComposerProps): JSX.Element {
  const [text, setText] = useState<string>("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (text.trim() && wsReady) {
        onSend(text);
        setText("");
      }
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <textarea
        value={text}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        onKeyDown={handleKeyDown}
        rows={4}
        style={{ width: "100%" }}
        placeholder={
          wsReady
            ? "여기에 발화를 입력하고 Send를 누르거나 Ctrl+Enter를 눌러봐."
            : "WebSocket이 아직 열리지 않았어. Session ID를 확인하고 잠시 기다려줘."
        }
      />
      <button
        onClick={() => {
          if (text.trim() && wsReady) {
            onSend(text);
            setText("");
          }
        }}
        style={{ marginTop: 8 }}
        disabled={!wsReady}
      >
        {wsReady ? "Send" : "WS 대기중..."}
      </button>
    </div>
  );
}

export default App;
