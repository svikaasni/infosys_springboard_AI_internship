import os
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from sqlalchemy.orm import Session

from app.rag.embeddings import embedder, EXPECTED_DIM

DEFAULT_STORE_DIR = Path(__file__).resolve().parents[2]


class VectorStore:
    def __init__(self, store_path: Optional[str] = None, meta_path: Optional[str] = None):
        base_dir = Path(os.environ.get("VECTOR_STORE_DIR", DEFAULT_STORE_DIR))
        self.store_path = str(store_path or (base_dir / "vector_store.npz"))
        self.meta_path = str(meta_path or (base_dir / "meta_store.json"))
        self.vectors: Optional[np.ndarray] = None
        self.metadata: List[Dict[str, Any]] = []
        self.load()

    def load(self):
        """Load vector store files from disk if they exist and are valid."""
        if os.path.exists(self.store_path) and os.path.exists(self.meta_path):
            try:
                data = np.load(self.store_path)
                vectors = data['vectors']
                with open(self.meta_path, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)

                if (
                    isinstance(vectors, np.ndarray)
                    and vectors.ndim == 2
                    and vectors.shape[1] == EXPECTED_DIM
                    and len(vectors) == len(metadata)
                ):
                    self.vectors = vectors.astype(np.float32)
                    self.metadata = metadata
                    return
            except Exception as e:
                print(f"Warning: Could not load vector store files: {e}")

        self.vectors = None
        self.metadata = []

    def save(self):
        """Persist vector store and metadata to disk."""
        os.makedirs(os.path.dirname(os.path.abspath(self.store_path)), exist_ok=True)
        if self.vectors is not None and len(self.vectors) > 0:
            np.savez(self.store_path, vectors=self.vectors)
        else:
            np.savez(self.store_path, vectors=np.empty((0, EXPECTED_DIM), dtype=np.float32))

        with open(self.meta_path, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, indent=2)

    def rebuild_from_knowledge_base(self, db: Session):
        """Rebuild vector store completely from SQLite resolved/closed Bug records with resolution notes."""
        from app.models import Bug, StatusEnum

        kb_bugs = (
            db.query(Bug)
            .filter(
                Bug.status.in_([StatusEnum.resolved, StatusEnum.closed]),
                Bug.resolution_notes.isnot(None),
                Bug.resolution_notes != "",
            )
            .all()
        )

        if not kb_bugs:
            self.vectors = np.empty((0, EXPECTED_DIM), dtype=np.float32)
            self.metadata = []
            self.save()
            return

        texts = []
        metadatas = []
        seen_ids = set()

        for b in kb_bugs:
            if b.id in seen_ids:
                continue
            seen_ids.add(b.id)

            text_content = f"{b.title or ''} {b.description or ''} {b.resolution_notes or ''}".strip()
            if not text_content:
                text_content = f"Knowledge Base Bug #{b.id}"

            severity_val = b.severity.value if hasattr(b.severity, "value") else b.severity
            status_val = b.status.value if hasattr(b.status, "value") else b.status

            meta = {
                "id": b.id,
                "title": b.title,
                "category": b.category,
                "module": b.module,
                "language": b.language,
                "severity": str(severity_val),
                "status": str(status_val),
                "resolution_notes": b.resolution_notes,
            }
            texts.append(text_content)
            metadatas.append(meta)

        embeddings = embedder.encode(texts)
        self.vectors = np.array(embeddings, dtype=np.float32)
        self.metadata = metadatas
        self.save()

    def ensure_initialized(self, db: Session):
        """Check vector store validity and completeness against DB; rebuild if necessary."""
        from app.models import Bug, StatusEnum

        kb_bugs = (
            db.query(Bug)
            .filter(
                Bug.status.in_([StatusEnum.resolved, StatusEnum.closed]),
                Bug.resolution_notes.isnot(None),
                Bug.resolution_notes != "",
            )
            .all()
        )
        db_kb_ids = set(b.id for b in kb_bugs)

        needs_rebuild = False

        if self.vectors is None or len(self.metadata) == 0:
            if len(db_kb_ids) > 0:
                needs_rebuild = True
        elif (
            self.vectors.ndim != 2
            or self.vectors.shape[1] != EXPECTED_DIM
            or len(self.vectors) != len(self.metadata)
        ):
            needs_rebuild = True
        else:
            indexed_ids = set(m.get("id") for m in self.metadata if isinstance(m, dict) and "id" in m)
            if not db_kb_ids.issubset(indexed_ids):
                needs_rebuild = True

        if needs_rebuild:
            self.rebuild_from_knowledge_base(db)

    def add_bug_entry(self, bug):
        """Add or update a single resolved bug entry in vector store."""
        if not bug.resolution_notes:
            return

        text_content = f"{bug.title or ''} {bug.description or ''} {bug.resolution_notes or ''}".strip()
        if not text_content:
            text_content = f"Knowledge Base Bug #{bug.id}"

        severity_val = bug.severity.value if hasattr(bug.severity, "value") else bug.severity
        status_val = bug.status.value if hasattr(bug.status, "value") else bug.status

        meta = {
            "id": bug.id,
            "title": bug.title,
            "category": bug.category,
            "module": bug.module,
            "language": bug.language,
            "severity": str(severity_val),
            "status": str(status_val),
            "resolution_notes": bug.resolution_notes,
        }

        new_vec = embedder.encode([text_content])[0].astype(np.float32)

        existing_idx = None
        for idx, m in enumerate(self.metadata):
            if isinstance(m, dict) and m.get("id") == bug.id:
                existing_idx = idx
                break

        if existing_idx is not None and self.vectors is not None:
            self.vectors[existing_idx] = new_vec
            self.metadata[existing_idx] = meta
        else:
            if self.vectors is None or len(self.vectors) == 0:
                self.vectors = np.array([new_vec], dtype=np.float32)
            else:
                self.vectors = np.vstack([self.vectors, new_vec])
            self.metadata.append(meta)

        self.save()

    def search(self, query: str, top_k: int = 5, min_score: float = 0.0) -> List[Tuple[Dict[str, Any], float]]:
        if self.vectors is None or len(self.vectors) == 0 or not query.strip():
            return []

        query_vec = embedder.encode(query)[0]

        # Cosine similarity (since embeddings are unit normalized)
        similarities = np.dot(self.vectors, query_vec)

        top_indices = np.argsort(similarities)[::-1]

        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            if score >= min_score:
                results.append((self.metadata[idx], score))
            if len(results) >= top_k:
                break

        return results

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_vectors": len(self.metadata) if self.metadata else 0,
            "dimension": int(self.vectors.shape[1]) if self.vectors is not None and self.vectors.ndim == 2 else EXPECTED_DIM,
            "store_path": self.store_path,
            "meta_path": self.meta_path,
            "is_loaded": self.vectors is not None and len(self.metadata) > 0,
        }


vector_store = VectorStore()
