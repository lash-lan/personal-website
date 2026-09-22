'use strict';
/**
 * builder.js — makes a Word document from nothing.
 *
 * `docx.js` fills in an existing template. This is the other direction: it
 * builds a brand new .docx, which is what the new-joiner guides need, since
 * they are not a version of any Scicom form.
 *
 * A .docx is a ZIP holding a handful of XML files. The smallest valid one
 * needs five, and this writes all five plus the logo:
 *
 *   [Content_Types].xml          what kind of file each part is
 *   _rels/.rels                  points at the main document
 *   word/document.xml            the content
 *   word/styles.xml              the fonts and heading styles
 *   word/_rels/document.xml.rels points at the styles and the logo
 *   word/media/logo.png          the logo itself
 *
 * Everything is laid out in twentieths of a point (Word calls these "twips")
 * and, for pictures, in EMUs — 914,400 to the inch. Both are Word's units, not
 * a choice made here.
 */

const fs = require('fs');
const path = require('path');
const zip = require('./zip');

const TWIP = 20;                    // 1 point
const EMU_PER_INCH = 914400;
const PAGE_WIDTH_TWIPS = 12240;     // US Letter, which is what the Scicom forms use
const MARGIN_TWIPS = 1080;          // 0.75 inch
const CONTENT_WIDTH = PAGE_WIDTH_TWIPS - MARGIN_TWIPS * 2;

const NAVY = '233E85';
const ORANGE = 'EB7D23';
const GREY = '5B6486';
const LIGHT = 'F2F4FA';
const LINE = 'D8DEEE';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ------------------------------------------------------------- pieces */

/** A run of text. `o` may set bold, italic, size (points), colour, font. */
function run(text, o = {}) {
  const rPr = [
    o.bold ? '<w:b/>' : '',
    o.italic ? '<w:i/>' : '',
    o.font ? `<w:rFonts w:ascii="${o.font}" w:hAnsi="${o.font}" w:cs="${o.font}"/>` : '',
    o.colour ? `<w:color w:val="${o.colour}"/>` : '',
    o.size ? `<w:sz w:val="${o.size * 2}"/><w:szCs w:val="${o.size * 2}"/>` : '',
    o.caps ? '<w:caps/>' : '',
    o.spacing ? `<w:spacing w:val="${o.spacing}"/>` : '',
  ].join('');
  const parts = String(text).split('\n');
  return parts.map((part, i) =>
    `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}` +
    (i ? '<w:br/>' : '') +
    `<w:t xml:space="preserve">${esc(part)}</w:t></w:r>`).join('');
}

/** A paragraph. `o` sets alignment, spacing, indent, borders, shading. */
function para(content, o = {}) {
  const pPr = [
    o.style ? `<w:pStyle w:val="${o.style}"/>` : '',
    o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : '',
    o.borderBottom
      ? `<w:pBdr><w:bottom w:val="single" w:sz="${o.borderBottom.size || 6}" w:space="${o.borderBottom.space || 4}" w:color="${o.borderBottom.colour || LINE}"/></w:pBdr>`
      : '',
    o.borderLeft
      ? `<w:pBdr><w:left w:val="single" w:sz="${o.borderLeft.size || 24}" w:space="8" w:color="${o.borderLeft.colour || ORANGE}"/></w:pBdr>`
      : '',
    (o.before != null || o.after != null || o.line != null)
      ? `<w:spacing${o.before != null ? ` w:before="${o.before * TWIP}"` : ''}` +
        `${o.after != null ? ` w:after="${o.after * TWIP}"` : ''}` +
        `${o.line != null ? ` w:line="${o.line}" w:lineRule="auto"` : ''}/>`
      : '',
    (o.indent || o.hanging)
      ? `<w:ind${o.indent ? ` w:left="${o.indent}"` : ''}${o.hanging ? ` w:hanging="${o.hanging}"` : ''}/>`
      : '',
    o.align ? `<w:jc w:val="${o.align}"/>` : '',
    o.keepNext ? '<w:keepNext/>' : '',
  ].join('');
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${content}</w:p>`;
}

/** An empty paragraph, used for vertical space. */
function spacer(points = 6) {
  return para('', { after: points });
}

function cell(content, o = {}) {
  const shd = o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : '';
  const width = o.width ? `<w:tcW w:w="${o.width}" w:type="dxa"/>` : '';
  const span = o.span ? `<w:gridSpan w:val="${o.span}"/>` : '';
  const valign = `<w:vAlign w:val="${o.valign || 'top'}"/>`;
  const borders = o.noBorders
    ? '<w:tcBorders>' + ['top', 'start', 'bottom', 'end']
      .map((s) => `<w:${s} w:val="nil"/>`).join('') + '</w:tcBorders>'
    : `<w:tcBorders>` + ['top', 'start', 'bottom', 'end']
      .map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="${o.borderColour || LINE}"/>`)
      .join('') + '</w:tcBorders>';
  const margins = '<w:tcMar>'
    + `<w:top w:w="${o.padY || 90}" w:type="dxa"/><w:start w:w="${o.padX || 130}" w:type="dxa"/>`
    + `<w:bottom w:w="${o.padY || 90}" w:type="dxa"/><w:end w:w="${o.padX || 130}" w:type="dxa"/>`
    + '</w:tcMar>';
  return `<w:tc><w:tcPr>${width}${span}${borders}${shd}${margins}${valign}</w:tcPr>${content}</w:tc>`;
}

function table(rows, widths, o = {}) {
  const grid = widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('');
  return '<w:tbl><w:tblPr>'
    + `<w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/>`
    + '<w:tblLayout w:type="fixed"/>'
    + (o.noBorders
      ? '<w:tblBorders>' + ['top', 'start', 'bottom', 'end', 'insideH', 'insideV']
        .map((s) => `<w:${s} w:val="nil"/>`).join('') + '</w:tblBorders>'
      : '')
    + '</w:tblPr>'
    + `<w:tblGrid>${grid}</w:tblGrid>`
    + rows.map((r) => `<w:tr>${r}</w:tr>`).join('')
    + '</w:tbl>';
}

/** The logo, sized in inches. */
function image(relId, widthInches, heightInches) {
  const cx = Math.round(widthInches * EMU_PER_INCH);
  const cy = Math.round(heightInches * EMU_PER_INCH);
  return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">'
    + `<wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Logo"/>`
    + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
    + '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    + '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    + '<pic:nvPicPr><pic:cNvPr id="1" name="Logo"/><pic:cNvPicPr/></pic:nvPicPr>'
    + `<pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
    + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`
    + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
    + '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
}

/* --------------------------------------------------------- the package */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
<w:sz w:val="21"/><w:szCs w:val="21"/><w:color w:val="1A2440"/>
</w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/></w:style>
</w:styles>`;

function coreProps(title) {
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(title)}</dc:title>
<dc:creator>Scicom Axe</dc:creator>
<cp:lastModifiedBy>Scicom Axe</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function documentXml(bodyXml) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<w:body>${bodyXml}
<w:sectPr>
<w:pgSz w:w="${PAGE_WIDTH_TWIPS}" w:h="15840"/>
<w:pgMar w:top="${MARGIN_TWIPS}" w:right="${MARGIN_TWIPS}" w:bottom="${MARGIN_TWIPS}" w:left="${MARGIN_TWIPS}" w:header="0" w:footer="0" w:gutter="0"/>
</w:sectPr></w:body></w:document>`;
}

/** Write the finished package to disk. */
function write(bodyXml, { outPath, title, logoPath }) {
  const entries = [
    { name: '[Content_Types].xml', data: Buffer.from(CONTENT_TYPES, 'utf8'), method: 8 },
    { name: '_rels/.rels', data: Buffer.from(ROOT_RELS, 'utf8'), method: 8 },
    { name: 'docProps/core.xml', data: Buffer.from(coreProps(title), 'utf8'), method: 8 },
    { name: 'word/document.xml', data: Buffer.from(documentXml(bodyXml), 'utf8'), method: 8 },
    { name: 'word/styles.xml', data: Buffer.from(STYLES, 'utf8'), method: 8 },
    { name: 'word/_rels/document.xml.rels', data: Buffer.from(DOC_RELS, 'utf8'), method: 8 },
  ];
  const logo = logoPath || path.join(__dirname, '..', 'public', 'img', 'logo.png');
  if (fs.existsSync(logo)) {
    entries.push({ name: 'word/media/logo.png', data: fs.readFileSync(logo), method: 8 });
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, zip.write(entries));
  return outPath;
}

module.exports = {
  run, para, spacer, cell, table, image, write,
  esc, TWIP, CONTENT_WIDTH, NAVY, ORANGE, GREY, LIGHT, LINE,
};
