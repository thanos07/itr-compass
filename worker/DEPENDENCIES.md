# Python worker dependency notes

The worker intentionally avoids PyMuPDF so the starter does not introduce its AGPL/commercial dual-licensing decision.

Runtime dependencies declared in `requirements.txt`:

- **FastAPI** — MIT
- **Uvicorn** — BSD-3-Clause
- **python-multipart** — Apache-2.0
- **pypdf** — BSD-3-Clause
- **defusedxml** — Python Software Foundation licence family
- **openpyxl** — MIT

These notes are informational. Preserve the dependency metadata installed by `pip`, review the exact versions resolved during deployment, and regenerate a software bill of materials for public releases.
