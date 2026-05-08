"""
Tests for the RAG endpoints:
  POST  /rag/ingest  — document ingestion
  POST  /rag/query   — semantic search + generation
  POST  /rag/chat    — multi-turn conversation
  GET   /rag/chat/:session_id — history retrieval

All external dependencies (OpenAI, Claude, Redis, DB) are patched.
"""
import json
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch


# ─── Shared helpers ──────────────────────────────────────────────────────────

def _fake_embedding(dim: int = 1536) -> list[float]:
    return [0.01] * dim


def _make_openai_embed_response(texts: list[str]) -> MagicMock:
    resp = MagicMock()
    resp.data = [
        MagicMock(embedding=_fake_embedding(), index=i) for i, _ in enumerate(texts)
    ]
    return resp


def _make_claude_response(text: str) -> MagicMock:
    msg = MagicMock()
    msg.content = [MagicMock(text=text)]
    return msg


# ─── Ingest tests ────────────────────────────────────────────────────────────

class TestRagIngest:
    def test_plain_text_ingest(self, client):
        """Plain-text upload should chunk, embed, and return chunk count."""
        content = b"School fee policy: Fees are due on the 5th of every month. " * 30

        with (
            patch("routers.rag_ingest.AsyncSessionLocal") as mock_session_cls,
            patch("routers.rag_ingest.openai_client") as mock_oai,
        ):
            # Mock DB session
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            mock_session_cls.return_value = mock_session

            # Mock OpenAI embeddings
            mock_oai.embeddings.create = AsyncMock(
                side_effect=lambda model, input: _make_openai_embed_response(input)
            )

            resp = client.post(
                "/rag/ingest",
                data={
                    "document_id": "doc-001",
                    "school_id": "school-001",
                    "tenant_id": "tenant-001",
                    "doc_type": "POLICY",
                },
                files={"file": ("policy.txt", BytesIO(content), "text/plain")},
                headers={"X-AI-Service-Key": "test-key"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["document_id"] == "doc-001"
        assert data["chunks_created"] >= 1
        assert data["status"] == "READY"

    def test_empty_document_returns_422(self, client):
        """Empty file should return HTTP 422."""
        with (
            patch("routers.rag_ingest.AsyncSessionLocal") as mock_session_cls,
            patch("routers.rag_ingest.openai_client"),
        ):
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            mock_session_cls.return_value = mock_session

            resp = client.post(
                "/rag/ingest",
                data={
                    "document_id": "doc-002",
                    "school_id": "school-001",
                    "tenant_id": "tenant-001",
                },
                files={"file": ("empty.txt", BytesIO(b"   "), "text/plain")},
                headers={"X-AI-Service-Key": "test-key"},
            )

        assert resp.status_code == 422

    def test_pdf_ingest_calls_pypdf(self, client):
        """PDF content-type should trigger PDF extraction path."""
        dummy_pdf = b"%PDF-1.4 fake"

        with (
            patch("routers.rag_ingest.AsyncSessionLocal") as mock_session_cls,
            patch("routers.rag_ingest.openai_client") as mock_oai,
            patch("routers.rag_ingest._extract_pdf", return_value="Policy content " * 20) as mock_pdf,
        ):
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            mock_session_cls.return_value = mock_session
            mock_oai.embeddings.create = AsyncMock(
                side_effect=lambda model, input: _make_openai_embed_response(input)
            )

            resp = client.post(
                "/rag/ingest",
                data={
                    "document_id": "doc-003",
                    "school_id": "school-001",
                    "tenant_id": "tenant-001",
                },
                files={"file": ("doc.pdf", BytesIO(dummy_pdf), "application/pdf")},
                headers={"X-AI-Service-Key": "test-key"},
            )

        mock_pdf.assert_called_once()
        assert resp.status_code == 200


# ─── Query tests ─────────────────────────────────────────────────────────────

class TestRagQuery:
    def _make_db_rows(self, n: int = 3) -> list[MagicMock]:
        rows = []
        for i in range(n):
            row = MagicMock()
            row.id = f"chunk-{i}"
            row.document_id = "doc-001"
            row.chunk_index = i
            row.content = f"Fee structure paragraph {i}. Tuition is Rs 5000 per month."
            row.embedding_json = json.dumps(_fake_embedding())
            row.doc_title = "Fee Structure 2025"
            rows.append(row)
        return rows

    def test_returns_answer_and_sources(self, client):
        """Query should return a generated answer with source citations."""
        with (
            patch("routers.rag_query.AsyncSessionLocal") as mock_session_cls,
            patch("routers.rag_query.openai_client") as mock_oai,
            patch("routers.rag_query.claude_client") as mock_claude,
        ):
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            result_mock = MagicMock()
            result_mock.fetchall.return_value = self._make_db_rows()
            mock_session.execute = AsyncMock(return_value=result_mock)
            mock_session_cls.return_value = mock_session

            mock_oai.embeddings.create = AsyncMock(
                return_value=_make_openai_embed_response(["test query"])
            )
            mock_claude.messages.create.return_value = _make_claude_response(
                "The monthly fee is Rs 5000 [Source 1]."
            )

            resp = client.post(
                "/rag/query",
                json={
                    "query": "How much is the monthly fee?",
                    "school_id": "school-001",
                    "tenant_id": "tenant-001",
                },
                headers={"X-AI-Service-Key": "test-key"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert "answer" in data
        assert "sources" in data
        assert len(data["sources"]) > 0
        assert data["sources"][0]["doc_title"] == "Fee Structure 2025"

    def test_empty_query_returns_422(self, client):
        resp = client.post(
            "/rag/query",
            json={"query": "", "school_id": "s1", "tenant_id": "t1"},
            headers={"X-AI-Service-Key": "test-key"},
        )
        assert resp.status_code == 422

    def test_no_documents_returns_fallback(self, client):
        """When no chunks exist, return a friendly 'no documents' message."""
        with (
            patch("routers.rag_query.AsyncSessionLocal") as mock_session_cls,
            patch("routers.rag_query.openai_client") as mock_oai,
            patch("routers.rag_query.claude_client"),
        ):
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            result_mock = MagicMock()
            result_mock.fetchall.return_value = []
            mock_session.execute = AsyncMock(return_value=result_mock)
            mock_session_cls.return_value = mock_session
            mock_oai.embeddings.create = AsyncMock(
                return_value=_make_openai_embed_response(["q"])
            )

            resp = client.post(
                "/rag/query",
                json={"query": "What are the fees?", "school_id": "s1", "tenant_id": "t1"},
                headers={"X-AI-Service-Key": "test-key"},
            )

        assert resp.status_code == 200
        assert "No knowledge base" in resp.json()["answer"]


# ─── Chat tests ──────────────────────────────────────────────────────────────

class TestRagChat:
    def _patch_all(self, mock_session_cls, mock_oai, mock_claude, mock_redis_cls, db_rows=None):
        # DB session
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        result_mock = MagicMock()
        result_mock.fetchall.return_value = db_rows or []
        result_mock.fetchone.return_value = None
        mock_session.execute = AsyncMock(return_value=result_mock)
        mock_session_cls.return_value = mock_session

        # OpenAI
        mock_oai.embeddings.create = AsyncMock(
            return_value=_make_openai_embed_response(["hi"])
        )

        # Claude
        mock_claude.messages.create.return_value = _make_claude_response(
            "Sure, I can help with that [Source 1]."
        )

        # Redis
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock(return_value=True)
        mock_redis_cls.return_value = mock_redis

    def test_new_session_created(self, client):
        """First chat message should create a new session_id."""
        with (
            patch("routers.rag_chat.AsyncSessionLocal") as mock_session_cls,
            patch("routers.rag_chat.openai_client") as mock_oai,
            patch("routers.rag_chat.claude_client") as mock_claude,
            patch("routers.rag_chat.aioredis.from_url") as mock_redis_cls,
            patch("routers.rag_chat._redis_client", None),
        ):
            self._patch_all(mock_session_cls, mock_oai, mock_claude, mock_redis_cls)

            resp = client.post(
                "/rag/chat",
                json={
                    "message": "What are the school holidays?",
                    "school_id": "school-001",
                    "tenant_id": "tenant-001",
                    "user_id": "user-001",
                },
                headers={"X-AI-Service-Key": "test-key"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert "session_id" in data
        assert len(data["session_id"]) > 0
        assert "answer" in data
        assert len(data["history"]) == 2  # user + assistant

    def test_existing_session_loads_history(self, client):
        """Sending a session_id should load and extend prior history."""
        prior_history = json.dumps([
            {"role": "user", "content": "previous question"},
            {"role": "assistant", "content": "previous answer"},
        ])

        with (
            patch("routers.rag_chat.AsyncSessionLocal") as mock_session_cls,
            patch("routers.rag_chat.openai_client") as mock_oai,
            patch("routers.rag_chat.claude_client") as mock_claude,
            patch("routers.rag_chat.aioredis.from_url") as mock_redis_cls,
            patch("routers.rag_chat._redis_client", None),
        ):
            self._patch_all(mock_session_cls, mock_oai, mock_claude, mock_redis_cls)
            # Override redis.get to return prior history
            mock_redis_cls.return_value.get = AsyncMock(return_value=prior_history)

            resp = client.post(
                "/rag/chat",
                json={
                    "message": "And what about the fee policy?",
                    "school_id": "school-001",
                    "tenant_id": "tenant-001",
                    "user_id": "user-001",
                    "session_id": "existing-session-id",
                },
                headers={"X-AI-Service-Key": "test-key"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["session_id"] == "existing-session-id"
        assert len(data["history"]) == 4  # 2 prior + 2 new

    def test_empty_message_returns_422(self, client):
        resp = client.post(
            "/rag/chat",
            json={"message": "", "school_id": "s1", "tenant_id": "t1", "user_id": "u1"},
            headers={"X-AI-Service-Key": "test-key"},
        )
        assert resp.status_code == 422
