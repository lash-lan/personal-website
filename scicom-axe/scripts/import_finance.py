#!/usr/bin/env python3
"""
import_finance.py — one-time import of the capitalised-cost spreadsheet into
data/finance.json.

The spreadsheet holds one row per vendor line item and one column per month,
in both USD and RM. This flattens it into one record per charge, which is what
the tracker needs in order to talk about invoices, dates and concerns.

Run again at any time to re-import; it replaces only records whose source is
"spreadsheet-import", leaving anything typed in by hand untouched.

    python3 scripts/import_finance.py "resources/Finance resources/<file>.xlsx"
"""
import json
import os
import re
import sys
from datetime import datetime

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "finance.json")


def month_key(v):
    if isinstance(v, datetime):
        return v.strftime("%Y-%m")
    return None


def clean(v):
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


def num(v):
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.replace(",", "").strip()
        try:
            return float(s)
        except ValueError:
            return None
    return None


def parse_sheet(ws, fy_label):
    """Find the month header row, then read each item row beneath it."""
    rows = list(ws.iter_rows(values_only=True))
    header_idx = None
    for i, r in enumerate(rows[:12]):
        if r and any(isinstance(c, datetime) for c in r):
            header_idx = i
            break
    if header_idx is None:
        return []

    header = rows[header_idx]
    # Columns carrying a month, split into the USD block then the RM block.
    month_cols = [(j, month_key(c)) for j, c in enumerate(header) if isinstance(c, datetime)]
    if not month_cols:
        return []
    # The RM block restarts the month sequence; find where it wraps.
    split = len(month_cols)
    for k in range(1, len(month_cols)):
        if month_cols[k][1] <= month_cols[k - 1][1]:
            split = k
            break
    usd_cols, rm_cols = month_cols[:split], month_cols[split:]

    # FX rates sit on a row above the header, aligned to the RM columns.
    fx = {}
    if header_idx >= 1:
        for j, m in rm_cols:
            for back in (1, 2):
                if header_idx - back < 0:
                    continue
                v = num(rows[header_idx - back][j]) if j < len(rows[header_idx - back]) else None
                if v and 2 < v < 8:          # a plausible USD->MYR rate
                    fx[m] = round(v, 4)
                    break

    # The label row ("Item | Company | Type | ...") is usually right below.
    label_row = rows[header_idx + 1] if header_idx + 1 < len(rows) else ()
    start = header_idx + 2 if label_row and str(label_row[0]).strip().lower() == "item" else header_idx + 1

    # Account code / project columns live at the far right.
    acct_col = proj_col = remark_col = None
    for j, c in enumerate(label_row or ()):
        s = str(c or "").strip().lower()
        if s == "account code":
            acct_col = j
        elif s == "project":
            proj_col = j
    for j, c in enumerate(header):
        s = str(c or "").strip().lower()
        if s == "account code":
            acct_col = j
        elif s == "project":
            proj_col = j
        elif s == "remark":
            remark_col = j

    out = []
    for r in rows[start:]:
        if not r:
            continue
        item = clean(r[0]) if len(r) > 0 else None
        if not item or str(item).lower().startswith(("total", "grand total")):
            continue
        company = clean(r[1]) if len(r) > 1 else None
        vtype = clean(r[2]) if len(r) > 2 else None
        purpose = clean(r[3]) if len(r) > 3 else None
        cost_type = clean(r[4]) if len(r) > 4 else None
        account = clean(r[acct_col]) if acct_col is not None and len(r) > acct_col else None
        project = clean(r[proj_col]) if proj_col is not None and len(r) > proj_col else None
        remark = clean(r[remark_col]) if remark_col is not None and len(r) > remark_col else None

        usd_by_month = {m: num(r[j]) for j, m in usd_cols if len(r) > j and num(r[j])}
        rm_by_month = {m: num(r[j]) for j, m in rm_cols if len(r) > j and num(r[j])}

        for m in sorted(set(usd_by_month) | set(rm_by_month)):
            usd = usd_by_month.get(m)
            rm = rm_by_month.get(m)
            if not usd and not rm:
                continue
            out.append({
                "sourceSheet": ws.title,
                "fy": fy_label,
                "month": m,
                "date": m + "-01",
                "vendor": str(item),
                "company": company,
                "type": vtype,
                "purpose": purpose,
                "costType": cost_type,
                "amountUSD": round(usd, 2) if usd else None,
                "amountRM": round(rm, 2) if rm else None,
                "fxRate": fx.get(m),
                "accountCode": account,
                "project": project,
                "remark": remark,
            })
    return out


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else None
    if not src:
        cand = [f for f in os.listdir(os.path.join(ROOT, "resources", "Finance resources"))
                if f.endswith(".xlsx")]
        if not cand:
            sys.exit("No spreadsheet given and none found in resources/Finance resources/")
        src = os.path.join("resources", "Finance resources", cand[0])
    path = src if os.path.isabs(src) else os.path.join(ROOT, src)

    wb = openpyxl.load_workbook(path, data_only=True)
    records = []
    for ws in wb.worksheets:
        fy = re.search(r"(20\d\d)", ws.title)
        records += parse_sheet(ws, fy.group(1) if fy else ws.title)

    # Keep anything the user typed in by hand.
    existing = []
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            existing = [r for r in json.load(fh) if r.get("source") != "spreadsheet-import"]

    seq = 0
    for r in records:
        seq += 1
        r["id"] = "fin_import_%04d" % seq
        r["ref"] = "FIN-I%04d" % seq
        r["source"] = "spreadsheet-import"
        r["sourceFile"] = os.path.basename(path)
        r["invoiceNo"] = None
        r["card"] = None
        r["status"] = "recorded"
        r["createdAt"] = datetime.now().isoformat(timespec="seconds")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(existing + records, fh, indent=2, ensure_ascii=False)

    print(f"Imported {len(records)} charges from {os.path.basename(path)}")
    print(f"Kept {len(existing)} hand-entered records")
    print(f"Written to {OUT}")


if __name__ == "__main__":
    main()
