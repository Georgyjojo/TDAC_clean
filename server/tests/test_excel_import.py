"""Excel import: parser, endpoints, and service behavior.

Three layers:
1. Parser unit tests against synthetic in-memory workbooks (header-token
   matching, sheet detection, rounding, error surfaces).
2. The real example workbook (~/storage/downloads/Input_sheet_V8_AGS_mapped
   .xlsx) parsed through the shared endpoint, pinning its exact shape.
3. HTTP-layer tests against FakePool: routing, auth, 409/404/409 branches,
   transaction + bulk-insert behavior, and that no new columns are
   referenced in any generated SQL.

The real-workbook test reads the user's file when present and SKIPS (with
an explicit message) otherwise, so the suite stays runnable everywhere.
"""

import io
import os
from datetime import date

import openpyxl
import pytest

from app.excel_parser import ExcelImportError, parse_input_sheet
from tests.conftest import auth_header, make_user_row

# The real V8 input sheet, committed as a fixture so the pinned-shape
# test runs on every machine, not just the device with the original file.
REAL_WORKBOOK = os.path.join(
    os.path.dirname(__file__),
    "fixtures",
    "Input_sheet_V8_AGS_mapped.xlsx",
)


def build_workbook(sheets: dict) -> bytes:
    """Sheets spec {name: [rows]} -> workbook bytes (in memory)."""
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    for name, rows in sheets.items():
        ws = wb.create_sheet(title=name)
        for row in rows:
            ws.append(row)
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


GOOD_SHEETS = {
    "ProjectInfo": [
        ["Project Type", "PROPOSED G+1 ADMIN BUILDING"],
        ["Project Location", "CHAMPAKKULAM"],
        ["Client Name", "Mr. BEJOY MICHLE"],
        ["Borehole Number", "BH 2"],
        ["Drilling Start Date", "17.08.2026"],
        ["Drilling Completion Date", "17.08.2026"],
        ["Termination Depth (m)", 23.45],
    ],
    "Borelog": [
        [
            "Depth From (m)", "Depth To (m)", "Soil Description",
            "Thickness", "Sand/ clay", "Average N value",
        ],
        [0, 1.5, "Filling Gravel", 1.5, None, 2],
        [1.5, 2.5, "Soft Sandy CLAY", 1, "C", 2],
        [None, None, None, None, None, None],  # padding ends data
        ["Depth From", "GEOL.GEOL_TOP"],  # legend below data
    ],
    "SPT_Data": [
        [
            "SPT Depth (m)", "Blows @15cm", "Blows @30cm",
            "Blows @45cm", "SPT N-value",
        ],
        [1, 1, 1, 1, 2],
        [2, 1, 1, 1, 2],
    ],
    "AGS_Mapping_Remarks": [
        ["ID", "Source sheet", "Source cell(s) / label"],
        [1, "ProjectInfo", "A2"],
    ],
}


class TestParserSynthetic:
    def test_full_parse(self):
        parsed = parse_input_sheet(build_workbook(GOOD_SHEETS))

        info = parsed["project_info"]
        assert info["project_type"] == "PROPOSED G+1 ADMIN BUILDING"
        assert info["project_location"] == "CHAMPAKKULAM"
        assert info["client_name"] == "Mr. BEJOY MICHLE"
        assert info["borehole_number"] == "BH 2"
        assert info["start_date"] == date(2026, 8, 17)
        assert info["end_date"] == date(2026, 8, 17)
        assert info["final_depth"] == 23.45

        assert parsed["borelog"] == [
            {
                "depth_from": 0.0, "depth_to": 1.5,
                "soil_description": "Filling Gravel", "sand_clay": None,
            },
            {
                "depth_from": 1.5, "depth_to": 2.5,
                "soil_description": "Soft Sandy CLAY", "sand_clay": "C",
            },
        ]

        assert parsed["spt"] == [
            {
                "spt_depth": 1.0, "blows_15": 1.0, "blows_30": 1.0,
                "blows_45": 1.0, "n_value": 2.0,
            },
            {
                "spt_depth": 2.0, "blows_15": 1.0, "blows_30": 1.0,
                "blows_45": 1.0, "n_value": 2.0,
            },
        ]

        assert parsed["rock_profile"] == []

    def test_float_artifacts_are_rounded(self):
        # 2.2 stored as 2.1999999999999997 must land as 2.2 so re-imports
        # hit the same unique-constraint identity.
        sheets = {
            "Borelog": [
                ["Depth From (m)", "Depth To (m)", "Soil Description"],
                [0, 2.1999999999999997, "CLAY"],
            ],
        }
        parsed = parse_input_sheet(build_workbook(sheets))
        assert parsed["borelog"][0]["depth_to"] == 2.2

    def test_renamed_sheets_still_import(self):
        # Detection is by header tokens, not sheet names.
        renamed = {
            "Site Data": GOOD_SHEETS["Borelog"],
            "Whatever": GOOD_SHEETS["SPT_Data"],
        }
        parsed = parse_input_sheet(build_workbook(renamed))
        assert len(parsed["borelog"]) == 2
        assert len(parsed["spt"]) == 2

    def test_bad_depth_order_raises(self):
        sheets = {
            "Borelog": [
                ["Depth From (m)", "Depth To (m)", "Soil Description"],
                [5.0, 4.0, "Inverted"],
            ],
        }
        with pytest.raises(ExcelImportError, match="Depth To must be greater"):
            parse_input_sheet(build_workbook(sheets))

    def test_no_data_sheets_raises(self):
        sheets = {"Notes": [["hello", "world"]]}
        with pytest.raises(ExcelImportError, match="No recognizable data"):
            parse_input_sheet(build_workbook(sheets))

    def test_not_a_workbook_raises(self):
        with pytest.raises(ExcelImportError, match="could not be opened"):
            parse_input_sheet(b"not an excel file")

    def test_spt_padding_rows_end_data_block(self):
        # The example SPT sheet pads with 20+ styled-empty rows and ends
        # with a derived "Layer 1..9" block; parsing must stop at the
        # first empty depth row.
        rows = [GOOD_SHEETS["SPT_Data"][0]] + [
            [1, 1, 1, 1, 2],
            [None] * 5,
            [None] * 5,
            [None, None, None, None, None],
            [None, 2, None, None, None],  # layer summary block
        ]
        parsed = parse_input_sheet(
            build_workbook({"SPT_Data": rows})
        )
        assert len(parsed["spt"]) == 1

    def test_rock_profile_sheet(self):
        sheets = {
            "Rock profile": [
                [
                    "Depth From (m)", "Depth To (m)", "Rock Description",
                    "Thickness", "Recovery", "RQD", "Remark",
                ],
                [10.0, 11.5, "WEATHERED ROCK", 1.5, 80, 60, "Core lost"],
            ],
        }
        parsed = parse_input_sheet(build_workbook(sheets))
        assert parsed["rock_profile"] == [
            {
                "depth_from": 10.0, "depth_to": 11.5,
                "rock_description": "WEATHERED ROCK", "recovery": 80.0,
                "rqd": 60.0, "remark": "Core lost",
            }
        ]


class TestParserRealWorkbook:
    def test_real_example_workbook(self):
        import os

        if not os.path.exists(REAL_WORKBOOK):
            pytest.skip(
                "Example workbook not present on this device "
                f"({REAL_WORKBOOK})"
            )

        parsed = parse_input_sheet(open(REAL_WORKBOOK, "rb").read())

        info = parsed["project_info"]
        assert info["borehole_number"] == "BH 2"
        assert info["final_depth"] == 23.45
        assert info["start_date"] == date(2026, 8, 17)

        assert len(parsed["borelog"]) == 10
        assert parsed["borelog"][0]["soil_description"] == "Filling Gravel"
        assert parsed["borelog"][-1]["depth_to"] == 23.45

        assert len(parsed["spt"]) == 14
        assert parsed["spt"][-1]["spt_depth"] == 23.0

        assert parsed["rock_profile"] == []


# ---------------------------------------------------------------------------
# HTTP layer (FakePool)
# ---------------------------------------------------------------------------

def post_workbook_file(client, sheets=None, filename="input.xlsx"):
    if sheets is None:
        sheets = GOOD_SHEETS
    data = build_workbook(sheets)
    return client.post(
        "/api/excel/workbook",
        files={"file": (filename, data, "application/vnd.ms-excel")},
        headers=auth_header(user_id=1),
    )


def make_commit_body(overrides=None):
    body = {
        "project_id": "901",
        "project_name": "Imported Project",
        "borehole_type": "BH",
        "workbook": {
            "project_info": {
                "project_location": "CHAMPAKKULAM",
                "client_name": "Mr. BEJOY MICHLE",
                "borehole_number": "BH 2",
                "start_date": "2026-08-17",
                "end_date": "2026-08-17",
                "final_depth": 23.45,
            },
            "borelog": [
                {
                    "depth_from": 0, "depth_to": 1.5,
                    "soil_description": "Filling Gravel",
                }
            ],
            "rock_profile": [],
            "spt": [
                {"spt_depth": 1, "blows_15": 1, "blows_30": 1,
                 "blows_45": 1, "n_value": 2}
            ],
        },
    }
    if overrides:
        body.update(overrides)
    return body


class TestParseEndpoint:
    def test_requires_auth(self, client, pool):
        resp = client.post("/api/excel/workbook")
        # HTTPBearer's missing-header code differs across fastapi/starlette
        # versions (403 historically, 401 on newer releases). The contract
        # under test is "rejected without credentials", not the exact code.
        assert resp.status_code in (401, 403)

    def test_parse_returns_workbook_and_suggestions(self, client, pool):
        pool.route("WHERE u.id", make_user_row())
        resp = post_workbook_file(client)
        assert resp.status_code == 200
        body = resp.json()

        assert body["suggestions"]["borehole_id"] == "BH 2"
        assert body["suggestions"]["final_depth"] == 23.45
        assert len(body["workbook"]["borelog"]) == 2
        assert body["workbook"]["project_info"]["client_name"] == (
            "Mr. BEJOY MICHLE"
        )

    def test_empty_file_rejected(self, client, pool):
        pool.route("WHERE u.id", make_user_row())
        resp = client.post(
            "/api/excel/workbook",
            files={"file": ("empty.xlsx", b"", "application/octet-stream")},
            headers=auth_header(user_id=1),
        )
        assert resp.status_code == 400
        assert "empty" in resp.json()["detail"]

    def test_bad_file_is_400_with_safe_message(self, client, pool):
        pool.route("WHERE u.id", make_user_row())
        resp = client.post(
            "/api/excel/workbook",
            files={
                "file": ("junk.xlsx", b"junk", "application/octet-stream")
            },
            headers=auth_header(user_id=1),
        )
        assert resp.status_code == 400
        assert "workbook" in resp.json()["detail"].lower()


class TestProjectImportEndpoint:
    def test_requires_auth(self, client, pool):
        resp = client.post(
            "/api/excel/projects",
            json=make_commit_body(),
        )
        # Version-dependent code (401/403); see TestParseEndpoint.
        assert resp.status_code in (401, 403)

    def test_creates_project_and_bulks_field_rows(self, client, pool):
        pool.route("WHERE u.id", make_user_row())
        pool.route('FROM "ags42"."PROJ" WHERE "PROJ_ID" = $1', None)

        resp = client.post(
            "/api/excel/projects",
            json=make_commit_body(),
            headers=auth_header(user_id=1),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["project_id"] == "901"
        assert body["borehole_id"] == "BH 2"
        assert body["geol_rows"] == 1
        assert body["spt_rows"] == 1
        assert body["core_rows"] == 0

        # One bulk insert per table, inside one transaction.
        assert len(pool.calls_with("executemany", "GEOL")) == 1
        assert len(pool.calls_with("executemany", "ISPT")) == 1
        assert len(pool.calls_with("executemany", "CORE")) == 0
        assert pool.calls_with("begin", "BEGIN")
        assert pool.calls_with("commit", "COMMIT")

        # PROJ + LOCA inserts carry the payload values.
        proj_args = pool.last_args("execute", 'INSERT INTO "ags42"."PROJ"')
        assert proj_args[0] == "901"
        assert proj_args[2] == "CHAMPAKKULAM"
        loca_args = pool.last_args("execute", 'INSERT INTO "ags42"."LOCA"')
        assert loca_args[0] == "BH 2"
        assert loca_args[5] == "901"

        # Bulk rows carry PROJ_ID first (FK + NOT NULL on GEOL/CORE/ISPT).
        geol_args = pool.last_args("executemany", "GEOL")
        assert geol_args[0][0] == ("901", "BH 2", 0.0, 1.5,
                                   "Filling Gravel", None)

    def test_duplicate_project_is_409(self, client, pool):
        pool.route("WHERE u.id", make_user_row())
        pool.route('FROM "ags42"."PROJ" WHERE "PROJ_ID" = $1', 1)

        resp = client.post(
            "/api/excel/projects",
            json=make_commit_body(),
            headers=auth_header(user_id=1),
        )
        assert resp.status_code == 409
        assert "already exists" in resp.json()["detail"]
        # Nothing written when the project exists.
        assert not pool.calls_with("execute", 'INSERT INTO "ags42"."PROJ"')

    def test_borehole_id_falls_back_to_sheet(self, client, pool):
        pool.route("WHERE u.id", make_user_row())
        pool.route('FROM "ags42"."PROJ" WHERE "PROJ_ID" = $1', None)

        body = make_commit_body({"borehole_id": None})
        resp = client.post(
            "/api/excel/projects",
            json=body,
            headers=auth_header(user_id=1),
        )
        assert resp.status_code == 200
        loca_args = pool.last_args("execute", 'INSERT INTO "ags42"."LOCA"')
        assert loca_args[0] == "BH 2"

    def test_missing_borehole_everywhere_is_400(self, client, pool):
        pool.route("WHERE u.id", make_user_row())

        body = make_commit_body()
        body["workbook"]["project_info"]["borehole_number"] = None
        resp = client.post(
            "/api/excel/projects",
            json=body,
            headers=auth_header(user_id=1),
        )
        assert resp.status_code == 400
        assert "borehole" in resp.json()["detail"].lower()
        assert not pool.calls_with("execute", 'INSERT INTO "ags42"."PROJ"')


class TestLocaImportEndpoint:
    def test_requires_auth(self, client, pool):
        resp = client.post(
            "/api/excel/projects/901/locas",
            json={"borehole_type": "BH", "workbook": {}},
        )
        # Version-dependent code (401/403); see TestParseEndpoint.
        assert resp.status_code in (401, 403)

    def test_adds_loca_to_existing_project(self, client, pool):
        pool.route("WHERE u.id", make_user_row())

        def proj_lookup(project_id):
            return 1 if project_id == "901" else None

        pool.route(
            'FROM "ags42"."PROJ" WHERE "PROJ_ID" = $1', proj_lookup
        )
        pool.route(
            'FROM "ags42"."LOCA"'
            ' WHERE "PROJ_ID" = $1 AND "LOCA_ID" = $2',
            lambda project_id, loca_id: None,
        )

        resp = client.post(
            "/api/excel/projects/901/locas",
            json={
                "borehole_type": "BH",
                "workbook": make_commit_body()["workbook"],
            },
            headers=auth_header(user_id=1),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["borehole_id"] == "BH 2"
        assert body["geol_rows"] == 1

        loca_args = pool.last_args("execute", 'INSERT INTO "ags42"."LOCA"')
        assert loca_args[5] == "901"

    def test_missing_project_is_404(self, client, pool):
        pool.route("WHERE u.id", make_user_row())
        pool.route(
            'FROM "ags42"."PROJ" WHERE "PROJ_ID" = $1', lambda *a: None
        )

        resp = client.post(
            "/api/excel/projects/404/locas",
            json={
                "borehole_type": "BH",
                "workbook": make_commit_body()["workbook"],
            },
            headers=auth_header(user_id=1),
        )
        assert resp.status_code == 404
        assert not pool.calls_with("execute", 'INSERT INTO "ags42"."LOCA"')

    def test_existing_loca_is_409(self, client, pool):
        pool.route("WHERE u.id", make_user_row())
        pool.route('FROM "ags42"."PROJ" WHERE "PROJ_ID" = $1', 1)
        pool.route(
            'FROM "ags42"."LOCA"'
            ' WHERE "PROJ_ID" = $1 AND "LOCA_ID" = $2',
            lambda *a: 1,
        )

        resp = client.post(
            "/api/excel/projects/901/locas",
            json={
                "borehole_type": "BH",
                "workbook": make_commit_body()["workbook"],
            },
            headers=auth_header(user_id=1),
        )
        assert resp.status_code == 409
        assert "already exists" in resp.json()["detail"]
        assert not pool.calls_with("execute", 'INSERT INTO "ags42"."LOCA"')

    def test_workbook_from_other_project_is_409(self, client, pool):
        pool.route("WHERE u.id", make_user_row())
        pool.route('FROM "ags42"."PROJ" WHERE "PROJ_ID" = $1', 1)

        workbook = make_commit_body()["workbook"]
        workbook["project_info"]["project_id"] = "other-project"

        resp = client.post(
            "/api/excel/projects/901/locas",
            json={"borehole_type": "BH", "workbook": workbook},
            headers=auth_header(user_id=1),
        )
        assert resp.status_code == 409
        assert "belongs to" in resp.json()["detail"]

    def test_workbook_without_borehole_is_400(self, client, pool):
        pool.route("WHERE u.id", make_user_row())

        workbook = make_commit_body()["workbook"]
        workbook["project_info"]["borehole_number"] = None

        resp = client.post(
            "/api/excel/projects/901/locas",
            json={"borehole_type": "BH", "workbook": workbook},
            headers=auth_header(user_id=1),
        )
        assert resp.status_code == 400
        assert "borehole" in resp.json()["detail"]


class TestNoSchemaGrowth:
    """The import touches only existing columns; pin that here."""

    def test_inserts_reference_no_new_columns(self, client, pool):
        pool.route("WHERE u.id", make_user_row())
        pool.route('FROM "ags42"."PROJ" WHERE "PROJ_ID" = $1', None)

        resp = client.post(
            "/api/excel/projects",
            json=make_commit_body(),
            headers=auth_header(user_id=1),
        )
        assert resp.status_code == 200

        allowed = {
            "PROJ": {"PROJ_ID", "PROJ_NAME", "PROJ_LOC", "PROJ_CLNT"},
            "LOCA": {"LOCA_ID", "LOCA_TYPE", "LOCA_STAR", "LOCA_ENDD",
                     "LOCA_FDEP", "PROJ_ID"},
            "GEOL": {"PROJ_ID", "LOCA_ID", "GEOL_TOP", "GEOL_BASE",
                     "GEOL_DESC", "GEOL_GEOL"},
            "CORE": {"PROJ_ID", "LOCA_ID", "CORE_TOP", "CORE_BASE",
                     "CORE_PREC", "CORE_RQD", "CORE_REM"},
            "ISPT": {"PROJ_ID", "LOCA_ID", "ISPT_TOP", "ISPT_INC1",
                     "ISPT_INC2", "ISPT_INC3", "ISPT_NVAL"},
        }

        import re as _re

        for method, sql, _args in pool.calls:
            for table, columns in allowed.items():
                pattern = _re.compile(
                    rf'INSERT INTO "ags42"\."{table}" \((.*?)\)'
                )
                match = pattern.search(sql)
                if match:
                    used = {
                        c.strip().strip('"')
                        for c in match.group(1).split(",")
                    }
                    unknown = used - columns
                    assert not unknown, (
                        f"{table} insert references unknown columns: "
                        f"{unknown}"
                    )
