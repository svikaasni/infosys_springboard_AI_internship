"""
Duplicate Detection Agent
--------------------------
Finds the top-N most similar past bugs to a newly submitted one, so a
developer can see "this looks like bug #47, already resolved" instead of
re-investigating from scratch.

Two embedding backends are supported, chosen automatically:

1. Sentence-Transformers + FAISS (preferred). Produces dense semantic
   embeddings and an approximate-nearest-neighbor index — the best match
   quality, especially once the corpus grows into the thousands. Requires
   downloading a small model from Hugging Face on first use, so it needs
   outbound internet access to huggingface.co.

2. TF-IDF + cosine similarity (automatic fallback). Pure scikit-learn,
   nothing to download, works completely offline. Matches on shared
   vocabulary rather than deep semantics, which is still effective for bug
   reports — error messages, exception names, and module names tend to
   repeat almost verbatim across duplicate bugs.

The agent tries backend #1 once per process and silently falls back to
backend #2 if the model can't be loaded (no internet, first run in an
offline environment, etc.), so the app works out of the box everywhere and
upgrades automatically wherever it has internet access.
"""
from dataclasses import dataclass
from typing import List, Optional

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


@dataclass
class DuplicateMatch:
    bug_id: int
    title: str
    similarity: float  # 0-100
    status: str
    resolution_notes: Optional[str]


class _EmbeddingBackend:
    """Lazily-loaded Sentence-Transformers + FAISS backend. Returns None on failure."""

    _model = None
    _faiss = None
    _load_attempted = False
    _available = False

    @classmethod
    def get(cls):
        if not cls._load_attempted:
            cls._load_attempted = True
            try:
                from sentence_transformers import SentenceTransformer
                import faiss

                cls._model = SentenceTransformer("all-MiniLM-L6-v2")
                cls._faiss = faiss
                cls._available = True
            except Exception:
                # No internet, model not cached, package missing, etc.
                # Fall back to TF-IDF below — this is expected in offline environments.
                cls._available = False
        return cls if cls._available else None

    @classmethod
    def embed(cls, texts: List[str]) -> np.ndarray:
        vectors = cls._model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return vectors.astype("float32")

    @classmethod
    def top_k(cls, query_vec: np.ndarray, corpus_vecs: np.ndarray, k: int):
        index = cls._faiss.IndexFlatIP(corpus_vecs.shape[1])  # inner product on normalized vecs = cosine sim
        index.add(corpus_vecs)
        scores, indices = index.search(query_vec.reshape(1, -1), min(k, len(corpus_vecs)))
        return indices[0], scores[0]


class DuplicateDetectionAgent:
    name = "Duplicate Detection Agent"

    # Matches below this similarity (0-100) are treated as noise, not real
    # candidates — a bare few percent of shared vocabulary or embedding
    # overlap isn't a meaningful duplicate signal and would otherwise leak
    # into the Root Cause / Remediation agents' evidence.
    MIN_SIMILARITY = 12.0

    def run(self, query_text: str, corpus: List[dict], top_k: int = 5) -> List[DuplicateMatch]:
        """
        corpus: list of dicts with keys: id, title, description, status, resolution_notes
        Excludes the bug being analyzed from its own corpus (caller's responsibility).
        """
        if not corpus:
            return []

        texts = [f"{c['title']} {c['description']}" for c in corpus]
        backend = _EmbeddingBackend.get()

        if backend is not None:
            try:
                corpus_vecs = backend.embed(texts)
                query_vec = backend.embed([query_text])[0]
                idx, scores = backend.top_k(query_vec, corpus_vecs, top_k)
                results = []
                for i, score in zip(idx, scores):
                    if i < 0:
                        continue
                    c = corpus[i]
                    pct = round(float(max(0.0, min(1.0, score))) * 100, 1)
                    if pct < self.MIN_SIMILARITY:
                        continue
                    results.append(
                        DuplicateMatch(
                            bug_id=c["id"],
                            title=c["title"],
                            similarity=pct,
                            status=c["status"],
                            resolution_notes=c.get("resolution_notes"),
                        )
                    )
                return sorted(results, key=lambda m: m.similarity, reverse=True)
            except Exception:
                pass  # fall through to TF-IDF backend below

        # --- TF-IDF + cosine similarity fallback ---
        vectorizer = TfidfVectorizer(stop_words="english", max_features=4096)
        all_texts = texts + [query_text]
        try:
            matrix = vectorizer.fit_transform(all_texts)
        except ValueError:
            # Empty vocabulary (e.g. corpus is only stopwords/very short) — no signal to compare.
            return []

        query_vec = matrix[-1]
        corpus_matrix = matrix[:-1]
        sims = cosine_similarity(query_vec, corpus_matrix)[0]

        ranked = sorted(range(len(corpus)), key=lambda i: sims[i], reverse=True)[:top_k]
        results = []
        for i in ranked:
            pct = round(float(sims[i]) * 100, 1)
            if pct < self.MIN_SIMILARITY:
                continue
            c = corpus[i]
            results.append(
                DuplicateMatch(
                    bug_id=c["id"],
                    title=c["title"],
                    similarity=pct,
                    status=c["status"],
                    resolution_notes=c.get("resolution_notes"),
                )
            )
        return results
