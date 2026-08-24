"""HTTP-boundary integration tests for the stateless parser service."""

from __future__ import annotations

import hashlib
import io
import json
import os
import zipfile

os.environ["ALLOWED_ORIGINS"] = "https://allowed.example"
os.environ["MAX_UPLOAD_MB"] = "1"
os.environ["MAX_EXPANDED_MB"] = "1"

from fastapi.testclient import TestClient
from pypdf import PdfWriter

import main


def post_file(client, name, data, content_type="application/octet-stream", consent=True, password=None):
    form = {"consent_acknowledged": "true" if consent else "false"}
    if password is not None:
        form["password"] = password
    return client.post("/parse", data=form, files={"file": (name, data, content_type)})


def encrypted_pdf(password):
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.encrypt(password)
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def oversized_zip():
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("large.txt", b"A" * (1024 * 1024 + 1))
    return output.getvalue()


def run():
    with TestClient(main.app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

        response = client.options(
            "/parse",
            headers={
                "Origin": "https://allowed.example",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == "https://allowed.example"

        response = client.get("/health", headers={"Origin": "https://blocked.example"})
        assert response.status_code == 200
        assert "access-control-allow-origin" not in response.headers

        response = client.post("/parse", data={"consent_acknowledged": "true"})
        assert response.status_code == 422

        payload = json.dumps({"salary": 100}).encode()
        response = post_file(client, "salary.json", payload, "application/json", consent=False)
        assert response.status_code == 400
        assert "consent" in response.json()["detail"].lower()

        response = post_file(client, "../../salary.json", payload, "application/json")
        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "salary.json"
        assert body["sha256"] == hashlib.sha256(payload).hexdigest()
        assert '"salary": 100' in body["text"]
        assert body["units"] == 1
        assert body["warnings"] == []
        assert body["retained"] is False

        response = post_file(client, "broken.json", b'{"salary":', "application/json")
        assert response.status_code == 400
        assert "Invalid JSON" in response.json()["detail"]

        response = post_file(client, "payload.exe", b"not-an-executable")
        assert response.status_code == 415

        response = post_file(client, "large.txt", b"A" * (1024 * 1024 + 1), "text/plain")
        assert response.status_code == 413
        assert "1 MB limit" in response.json()["detail"]

        pdf = encrypted_pdf("secret")
        response = post_file(client, "encrypted.pdf", pdf, "application/pdf")
        assert response.status_code == 422
        assert "password" in response.json()["detail"].lower()

        response = post_file(client, "encrypted.pdf", pdf, "application/pdf", password="secret")
        assert response.status_code == 200
        assert response.json()["units"] == 1

        response = post_file(client, "large.zip", oversized_zip(), "application/zip")
        assert response.status_code == 413
        assert "expands beyond" in response.json()["detail"]

    print("FastAPI parser HTTP integration tests passed.")


if __name__ == "__main__":
    run()
