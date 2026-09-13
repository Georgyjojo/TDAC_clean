"""Utility endpoints in app/main.py: root, DB probes, password probe, CORS."""
from datetime import datetime, timezone

from app.auth.security import verify_password


class TestRoot:
    def test_root(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json() == {"message": "Tdac api is running"}


class TestDbProbes:
    def test_testdb_returns_time(self, client, pool):
        now = datetime(2026, 9, 4, 12, 0, tzinfo=timezone.utc)
        pool.route("SELECT NOW()", now)
        resp = client.get("/api/testdb")
        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] == "Database connected"
        assert body["time"] is not None

    def test_test_schemas(self, client, pool):
        pool.route("information_schema.schemata", [{"schema_name": "public"}, {"schema_name": "tdac"}])
        assert client.get("/api/test-schemas").json() == {"schemas": ["public", "tdac"]}

    def test_test_tables(self, client, pool):
        pool.route("information_schema.tables", [{"table_schema": "tdac", "table_name": "users"}])
        assert client.get("/api/test-tables").json() == {
            "tables": [{"schema": "tdac", "table": "users"}]
        }

    def test_test_user_columns(self, client, pool):
        pool.route("table_name = 'users'", [{"column_name": "id", "data_type": "integer", "is_nullable": "NO"}])
        assert client.get("/api/test-user").json() == {
            "columns": [{"name": "id", "type": "integer", "nullable": "NO"}]
        }

    def test_test_role_columns(self, client, pool):
        pool.route("table_name = 'roles'", [{"column_name": "id", "data_type": "integer", "is_nullable": "NO"}])
        assert client.get("/api/test-role").json() == {
            "columns": [{"name": "id", "type": "integer", "nullable": "NO"}]
        }

    def test_empty_schema_list(self, client, pool):
        # no routes -> fetch returns []
        assert client.get("/api/test-schemas").json() == {"schemas": []}


class TestPasswordProbe:
    def test_test_password_returns_verifiable_hash(self, client):
        resp = client.get("/api/test-password")
        assert resp.status_code == 200
        body = resp.json()
        assert body["password"] == "test123"
        assert verify_password(body["password"], body["hashed_password"]) is True


class TestCors:
    def test_preflight_from_allowed_origin(self, client):
        resp = client.options(
            "/",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:5173"

    def test_preflight_from_unknown_origin_not_allowed(self, client):
        resp = client.options(
            "/",
            headers={
                "Origin": "http://evil.example",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp.headers.get("access-control-allow-origin") is None


class TestRouting:
    def test_unknown_path_404(self, client):
        assert client.get("/api/nope").status_code == 404

    def test_wrong_method_405(self, client):
        assert client.get("/api/auth/login").status_code == 405
