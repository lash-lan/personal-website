// Writes docs/blood-of-icetear-cards.xlsx, the whole set as a spreadsheet.
//
// Run: node scripts/export-cards-xlsx.mjs
//
// Generated from src/data/cards.js rather than kept by hand, so the
// spreadsheet can never drift from the game. Re-run it after changing a card.

import { writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  CARDS, TIERS, TIER_ORDER, artOf, numberOf, typeLineOf, copiesOf, versionsOf,
} from '../src/data/cards.js';

const order = (c) => TIER_ORDER.indexOf(c.tier);
const sorted = [...CARDS].sort((a, b) =>
  order(b) - order(a)            // rarest first, the way he reads the set
  || (b.power || 0) - (a.power || 0)
  || a.name.localeCompare(b.name));

const characters = sorted.filter((c) => c.type === 'character');
const spells = sorted.filter((c) => c.type === 'spell');

const row = (c) => ({
  Number: numberOf(c),
  Name: c.name,
  // The printed type line repeats the lineage in brackets, which is right on
  // a card and redundant in a spreadsheet that has a Lineage column.
  Type: typeLineOf(c).replace(/ \([^)]*\)$/, ''),
  Lineage: c.line || '',
  Rarity: TIERS[c.tier].name,
  Power: c.type === 'character' ? c.power : '',
  'Summoning cost': c.cost,
  'Copies per deck': copiesOf(c),
  Ability: c.text || '',
  Allegiance: (c.tags || []).filter((t) => t !== 'Token').join(', '),
  'Other versions': versionsOf(c).map((v) => v.name).join(', '),
  Art: artOf(c) ? artOf(c).split('/').pop() : 'not yet painted',
});

const data = {
  Characters: characters.map(row),
  Spells: spells.map(row),
  Rarities: TIER_ORDER.map((t) => ({
    Rarity: TIERS[t].name,
    Letter: TIERS[t].letter,
    'Power from': TIERS[t].power[0],
    'Power to': TIERS[t].power[1],
    'Copies per deck': TIERS[t].copies,
    'Cards in set': CARDS.filter((c) => c.tier === t).length,
  })),
};

// openpyxl is already on this machine, so the sheet is written through a short
// Python script rather than by adding a JavaScript dependency for one file.
const payload = new URL('../.cards-export.json', import.meta.url).pathname.slice(1);
const out = new URL('../docs/blood-of-icetear-cards.xlsx', import.meta.url).pathname.slice(1);
writeFileSync(payload, JSON.stringify(data), 'utf8');

execFileSync('python', ['-c', `
import json
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from openpyxl.utils import get_column_letter

data = json.load(open(r"""${payload}""", encoding="utf-8"))
wb = Workbook()
wb.remove(wb.active)

# One colour per rarity, matching the cards in the gallery.
FILLS = {
    "Common":    "FF9AA3A8",
    "Uncommon":  "FF7FAE82",
    "Rare":      "FF6F9DC9",
    "Epic":      "FFA988D0",
    "Ascendant": "FFD8A054",
    "Mythical":  "FFD4685E",
}
WIDTHS = {
    "Number": 16, "Name": 46, "Type": 32, "Lineage": 18, "Rarity": 11,
    "Power": 8, "Summoning cost": 15, "Copies per deck": 15,
    "Ability": 82, "Allegiance": 26, "Other versions": 34, "Art": 30,
    "Letter": 8, "Power from": 11, "Power to": 10, "Cards in set": 12,
}

for sheet, rows in data.items():
    ws = wb.create_sheet(sheet)
    if not rows:
        continue
    headers = list(rows[0].keys())
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFFFF")
        cell.fill = PatternFill("solid", fgColor="FF2B2B33")
        cell.alignment = Alignment(vertical="center")
    ws.freeze_panes = "B2"
    ws.auto_filter.ref = "A1:%s%d" % (get_column_letter(len(headers)), len(rows) + 1)

    for r in rows:
        ws.append([r[h] for h in headers])

    for i, h in enumerate(headers, start=1):
        ws.column_dimensions[get_column_letter(i)].width = WIDTHS.get(h, 18)

    rarity_col = headers.index("Rarity") + 1 if "Rarity" in headers else None
    for row_i in range(2, len(rows) + 2):
        for cell in ws[row_i]:
            cell.alignment = Alignment(vertical="top", wrap_text=(cell.column_letter ==
                get_column_letter(headers.index("Ability") + 1) if "Ability" in headers else False))
        if rarity_col:
            c = ws.cell(row=row_i, column=rarity_col)
            fill = FILLS.get(str(c.value))
            if fill:
                c.fill = PatternFill("solid", fgColor=fill)
                c.font = Font(bold=True, color="FF14130F")
                c.alignment = Alignment(horizontal="center", vertical="top")

wb.save(r"""${out}""")
print("sheets:", ", ".join("%s (%d)" % (k, len(v)) for k, v in data.items()))
`], { stdio: 'inherit' });

unlinkSync(payload);
console.log(`docs/blood-of-icetear-cards.xlsx written`);
