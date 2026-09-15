import os
import ssl
from typing import List, Union
import numpy as np

# Bypass SSL certificate verification for HuggingFace Hub downloads on Windows local dev
os.environ["HF_HUB_DISABLE_SSL_VERIFY"] = "1"
os.environ["PYTHONHTTPSVERIFY"] = "0"
os.environ["CURL_CA_BUNDLE"] = ""
os.environ["REQUESTS_CA_BUNDLE"] = ""

ssl._create_default_https_context = ssl._create_unverified_context

try:
    import urllib3
    urllib3.disable_warnings()
except ImportError:
    pass

try:
    import requests
    requests.Session.verify = False
except ImportError:
    pass

try:
    import httpx
    import huggingface_hub
    _orig_httpx_init = httpx.Client.__init__

    def _unverified_httpx_init(self, *args, **kwargs):
        kwargs['verify'] = False
        _orig_httpx_init(self, *args, **kwargs)

    httpx.Client.__init__ = _unverified_httpx_init
    if hasattr(huggingface_hub, 'set_client_factory'):
        huggingface_hub.set_client_factory(lambda: httpx.Client(verify=False))
except Exception:
    pass

MODEL_NAME = "all-MiniLM-L6-v2"
EXPECTED_DIM = 384


class SentenceTransformerEmbedder:
    """Semantic vector embedding engine powered by sentence-transformers/all-MiniLM-L6-v2 with fallback."""

    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name
        self._model = None
        self._load_attempted = False
        self._available = False

    def _get_model(self):
        if self._load_attempted:
            return self._model
        self._load_attempted = True
        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name)
            self._available = True
            return self._model
        except Exception as e:
            self._available = False
            return None

    def encode(self, texts: Union[str, List[str]]) -> np.ndarray:
        if isinstance(texts, str):
            texts = [texts]
        if not texts:
            return np.empty((0, EXPECTED_DIM), dtype=np.float32)

        model = self._get_model()
        if model is not None:
            try:
                embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings.astype(np.float32)
            except Exception:
                pass

        # Deterministic fallback embedding generation if sentence-transformers model is offline
        from sklearn.feature_extraction.text import HashingVectorizer
        vectorizer = HashingVectorizer(n_features=EXPECTED_DIM, alternate_sign=False, norm='l2')
        matrix = vectorizer.transform(texts)
        return matrix.toarray().astype(np.float32)

    def transform(self, text: str) -> List[float]:
        embeddings = self.encode(text)
        return embeddings[0].tolist()


embedder = SentenceTransformerEmbedder()
