from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Any
from sqlmodel import Session as DBSession

from ..models import Node, Link
from ..db import engine
from ..services.nlp_service import embed_texts, cosine_sim, SIM_THR

router = APIRouter(prefix="/ws", tags=["websocket"])

# 세션별 연결 목록, 노드 캐시
connections: Dict[str, List[WebSocket]] = {}
node_cache: Dict[str, List[Dict[str, Any]]] = {}

# 새 노드당 최대 몇 개까지 링크를 만들지
TOP_K = 3


async def broadcast(session_id: str, message: dict) -> None:
    """같은 session_id에 붙어 있는 모든 WebSocket으로 메시지 브로드캐스트."""
    dead: List[WebSocket] = []
    for ws in connections.get(session_id, []):
        try:
            await ws.send_json(message)
        except Exception:
            # 끊긴 소켓은 나중에 정리
            dead.append(ws)

    if dead:
        alive = [w for w in connections.get(session_id, []) if w not in dead]
        connections[session_id] = alive


@router.websocket("/session/{session_id}")
async def ws_session(ws: WebSocket, session_id: str):
    # 1) WebSocket 핸드셰이크 수락
    await ws.accept()
    print(f">>> WS connected: session={session_id}")

    # 2) 세션별 연결/캐시 초기화
    connections.setdefault(session_id, []).append(ws)
    node_cache.setdefault(session_id, [])

    try:
        while True:
            # 3) 클라이언트 메시지 수신 (JSON)
            msg = await ws.receive_json()
            print(">>> WS RAW:", msg)

            # type 이 "utterance" 가 아니면 무시
            if msg.get("type") != "utterance":
                print(">>> IGNORED MSG type:", msg.get("type"))
                continue

            user = msg.get("user", "anon")
            text = msg.get("text", "").strip()

            if not text:
                print(">>> EMPTY text, skip")
                continue

            print(f">>> ACCEPTED utterance | session={session_id} user={user} text={text!r}")

            # 4) DB에 새 노드 저장
            with DBSession(engine) as db:
                node = Node(session_id=session_id, user=user, text=text)
                db.add(node)
                db.commit()
                db.refresh(node)
                node_id = node.id

                # 5) 임베딩 계산 (기존 + 새 텍스트)
                cache = node_cache[session_id]
                texts = [n["text"] for n in cache] + [text]
                embs = embed_texts(texts)

                # 기존 캐시 벡터 갱신
                for c, v in zip(cache, embs[:-1]):
                    c["vec"] = v
                new_vec = embs[-1]

                # 새 노드를 캐시에 추가
                cache.append(
                    {
                        "id": node_id,
                        "text": text,
                        "user": user,
                        "vec": new_vec,
                    }
                )

                # 6) 유사도 기반 링크 생성 (top-k + threshold)
                sims: List[tuple[float, Dict[str, Any]]] = []
                for other in cache[:-1]:  # 마지막은 방금 추가한 새 노드
                    sim = cosine_sim(new_vec, other["vec"])
                    sims.append((sim, other))

                # 유사도 내림차순 정렬
                sims.sort(key=lambda x: x[0], reverse=True)

                links_payload: List[dict] = []

                for sim, other in sims[:TOP_K]:
                    if sim < SIM_THR:
                        # 이 아래는 전부 더 낮으니까 중단
                        break

                    link = Link(
                        session_id=session_id,
                        source_id=other["id"],
                        target_id=node_id,
                        similarity=sim,
                    )
                    db.add(link)
                    links_payload.append(
                        {
                            "source": other["id"],
                            "target": node_id,
                            "similarity": sim,
                        }
                    )

                db.commit()

                print(
                    f">>> NODE+LINKS saved | node_id={node_id} "
                    f"links={len(links_payload)}"
                )

            # 7) 프론트로 그래프 업데이트 브로드캐스트
            message = {
                "type": "graph_update",
                "payload": {
                    "node": {
                        "id": node_id,
                        "session_id": session_id,
                        "user": user,
                        "text": text,
                    },
                    "links": links_payload,
                },
            }

            await broadcast(session_id, message)
            print(">>> graph_update broadcasted")

    except WebSocketDisconnect:
        print(f">>> WS disconnected: session={session_id}")
    except Exception as e:
        # 디버깅용: 예외 로그 찍고 소켓 닫기
        import traceback

        print(">>> WS handler ERROR:", repr(e))
        traceback.print_exc()
    finally:
        # 연결 목록에서 제거
        conns = connections.get(session_id, [])
        if ws in conns:
            conns.remove(ws)
        print(f">>> WS cleanup done: session={session_id} now={len(conns)} conns")
