import os
import numpy as np
from typing import List

SIM_THR = float(os.getenv("SIMILARITY_THRESHOLD", "0.87"))

try:
    from sentence_transformers import SentenceTransformer
    MODEL_NAME = os.getenv("SENTENCE_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")
    _model = SentenceTransformer(MODEL_NAME)
except Exception:
    _model = None

def embed_texts(texts: List[str]) -> np.ndarray:
    if _model is None:
        # 개발용 폴백(의사 임베딩): 텍스트 해시 기반 고정 난수
        return np.stack([_cheap_embed(t) for t in texts])
    v = _model.encode(texts, normalize_embeddings=True)
    return np.array(v)

def _cheap_embed(t: str) -> np.ndarray:
    rng = np.random.default_rng(abs(hash(t)) % (2**32))
    v = rng.normal(size=384)
    v = v / (np.linalg.norm(v) + 1e-9)
    return v

def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))

print(">>> [NLP] MODEL LOADED?:", _model is not None)
print(">>> [NLP] MODEL NAME:", MODEL_NAME)