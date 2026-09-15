from typing import List, Dict, Any
from app.rag.vector_store import vector_store


class Retriever:
    @staticmethod
    def get_relevant_context(query: str, top_k: int = 3, min_score: float = 0.3) -> List[Dict[str, Any]]:
        results = vector_store.search(query, top_k=top_k, min_score=min_score)
        formatted_results = []
        for meta, score in results:
            formatted_results.append({
                "bug_id": meta.get("id"),
                "title": meta.get("title"),
                "category": meta.get("category"),
                "module": meta.get("module"),
                "language": meta.get("language"),
                "severity": meta.get("severity"),
                "resolution_notes": meta.get("resolution_notes"),
                "similarity_score": round(score * 100, 1),
            })
        return formatted_results


retriever = Retriever()
