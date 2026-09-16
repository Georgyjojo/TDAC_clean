"""Security review pins — from cross-checking the external black-box report
(../TDAC_Authentication_Test_Report.pdf, 2026-09-03) against the code.

Passing tests guard verified-good behavior. xfail(strict) tests pin the FIXED
state for issues confirmed real; the suite turns red when each is fixed.
"""
import re
from pathlib import Path

import pytest

from app.auth import security
from app.auth.schemas import LoginRequest
from app.auth.security import (
    SECRET_KEY,
    create_access_token,
    decode_access_token,
)

APP_DIR = Path(__file__).resolve().parent.parent / "app"


class TestVerifiedGood:
    def test_signature_tamper_is_rejected(self):
        """Corrupting payload bytes without re-signing must fail (external
        report claimed a tampered token got 200; current code rejects)."""
        from jose import JWTError

        tok = create_access_token({"sub": "1", "token_gen": 0})
        h, b, s = tok.split(".")
        corrupted = b.replace("I", "J").replace("l", "k") or b[:-2] + "xx"
        with pytest.raises(JWTError):
            decode_access_token(f"{h}.{corrupted}.{s}")

    def test_all_service_sql_is_parameterized(self):
        """Every SQL statement in user_service.py that filters or writes
        (WHERE/VALUES/SET) must use $N bind params and no f-string/format
        interpolation of values (SQL-injection guard). Full-table SELECTs
        without clauses are legitimately parameter-free."""
        src = (APP_DIR / "auth" / "user_service.py").read_text()
        assert "f\"" not in src and "f'" not in src and ".format(" not in src
        for query_block in re.findall(r'"""(.*?)"""', src, re.S):
            if not any(kw in query_block for kw in ("WHERE", "VALUES", "SET")):
                continue  # parameter-free statement (e.g. list all users)
            assert "$" in query_block, f"unparameterized SQL: {query_block[:60]}..."


class TestKnownIssuesPinned:
    @pytest.mark.xfail(strict=True, reason="known issue: /api/test-* endpoints are unauthenticated")
    def test_schema_disclosure_requires_auth(self, client, pool):
        """NEW ISSUE (info disclosure): /api/test-schemas, /api/test-tables,
        /api/test-user, /api/test-role, /api/testdb expose database schema
        internals with NO authentication (app/main.py:41-157). In production
        this maps the DB for an attacker. Expected: 401."""
        resp = client.get("/api/test-schemas")
        assert resp.status_code in (401, 403)

    @pytest.mark.xfail(strict=True, reason="known issue: /api/test-password is unauthenticated")
    def test_password_probe_requires_auth(self, client, pool):
        """NEW ISSUE: /api/test-password hands any unauthenticated caller a
        real bcrypt hash to take offline. Expected: 401 (or removed)."""
        resp = client.get("/api/test-password")
        assert resp.status_code in (401, 403)

    @pytest.mark.xfail(strict=True, reason="known issue: LoginRequest has no max_length")
    def test_login_rejects_absurd_password_length(self):
        """NEW ISSUE (DoS surface): LoginRequest.password has no max_length,
        so a 10,000-char password is accepted into bcrypt (which silently
        truncates at 72 bytes). UserCreate caps at 128 — login must match.
        External report hit the 500 on yesterday's build; the truncation
        itself is verified on current code."""
        with pytest.raises(Exception):
            LoginRequest(username="u", password="a" * 10_000)

    @pytest.mark.xfail(strict=True, reason="known issue: no jti/iat -> same-second tokens identical")
    def test_tokens_unique_within_same_second(self):
        """NEW ISSUE (external report #1, root cause verified): exp is
        int-seconds and tokens carry no jti/nonce, so two logins in the same
        second produce BYTE-IDENTICAL JWTs. Add uuid4 jti + iat claims."""
        t1 = create_access_token({"sub": "5", "token_gen": 0})
        t2 = create_access_token({"sub": "5", "token_gen": 0})
        assert t1 != t2

    def test_forged_token_with_known_secret_is_rejected(self):
        """K5 fixed: SECRET_KEY is externalized to JWT_SECRET_KEY, so the
        old committed value can no longer mint valid admin tokens. A
        token signed with the historical development secret must fail
        verification against the deployed secret."""
        from jose import jwt
        from jose.exceptions import JWTError

        if SECRET_KEY == "temporary-secret-key":
            pytest.fail(
                "JWT_SECRET_KEY leaked out of the environment (missing from "
                ".env): the app fell back to the committed development "
                "secret. Set JWT_SECRET_KEY before running the suite."
            )

        forged = jwt.encode(
            {"sub": "1", "token_gen": 0, "type": "access", "exp": 9999999999},
            "temporary-secret-key",
            algorithm="HS256",
        )
        with pytest.raises(JWTError):
            decode_access_token(forged)
