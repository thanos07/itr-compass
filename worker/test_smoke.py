"""Small no-network smoke tests for the stateless parser."""

import io
import json
import zipfile

from fastapi import HTTPException
from openpyxl import Workbook
from pypdf import PdfWriter

import main


def run() -> None:
    text, units, _ = main.parse_data(json.dumps({"salary": 100}).encode(), "a.json", None)
    assert "salary" in text and units == 1

    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["Gross salary", 1_200_000])
    spreadsheet = io.BytesIO()
    workbook.save(spreadsheet)
    text, units, _ = main.parse_data(spreadsheet.getvalue(), "a.xlsx", None)
    assert "Gross salary" in text and units == 1

    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    pdf = io.BytesIO()
    writer.write(pdf)
    _, units, warnings = main.parse_data(pdf.getvalue(), "a.pdf", None)
    assert units == 1 and any("scanned PDF" in warning for warning in warnings)

    safe_docx = io.BytesIO()
    with zipfile.ZipFile(safe_docx, "w") as archive:
        archive.writestr("word/document.xml", '<w:document xmlns:w="x"><w:p><w:t>Hello tax</w:t></w:p></w:document>')
    text, _, _ = main.parse_data(safe_docx.getvalue(), "a.docx", None)
    assert "Hello tax" in text

    unsafe_docx = io.BytesIO()
    with zipfile.ZipFile(unsafe_docx, "w") as archive:
        archive.writestr("word/document.xml", '<!DOCTYPE lolz [<!ENTITY lol "lol">]><w:document xmlns:w="x"><w:t>&lol;</w:t></w:document>')
    try:
        main.parse_data(unsafe_docx.getvalue(), "bad.docx", None)
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Unsafe entity-bearing XML was accepted")

    print("Python parser smoke and XML-hardening tests passed.")


if __name__ == "__main__":
    run()
