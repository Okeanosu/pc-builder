import { inflateSync } from 'node:zlib';

interface PdfObject {
  dict: string;
  stream?: Buffer;
}

function readObjects(pdf: Buffer): Map<number, PdfObject> {
  const s = pdf.toString('latin1');
  const out = new Map<number, PdfObject>();
  for (const m of s.matchAll(/(\d+) 0 obj\s*([\s\S]*?)endobj/g)) {
    const body = m[2]!;
    const at = body.indexOf('stream');
    if (at < 0) {
      out.set(Number(m[1]), { dict: body });
      continue;
    }
    const dict = body.slice(0, at);
    const raw = Buffer.from(
      body.slice(at + 6, body.lastIndexOf('endstream')).replace(/^\r?\n/, ''),
      'latin1',
    );
    let stream = raw;
    if (dict.includes('/FlateDecode')) {
      try {
        stream = inflateSync(raw);
      } catch {
        stream = raw;
      }
    }
    out.set(Number(m[1]), { dict, stream });
  }
  return out;
}

const utf16 = (hex: string) => Buffer.from(hex, 'hex').swap16().toString('utf16le');

function parseToUnicode(cmap: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const line of block[1]!.split('\n')) {
      const arr = /<([0-9a-f]+)>\s*<([0-9a-f]+)>\s*\[([^\]]*)\]/i.exec(line);
      if (arr) {
        const start = Number.parseInt(arr[1]!, 16);
        let code = start;
        for (const u of arr[3]!.matchAll(/<([0-9a-f]+)>/gi)) map.set(code++, utf16(u[1]!));
        continue;
      }
      const seq = /<([0-9a-f]+)>\s*<([0-9a-f]+)>\s*<([0-9a-f]+)>/i.exec(line);
      if (seq) {
        const [start, end, base] = [seq[1]!, seq[2]!, seq[3]!].map((h) => Number.parseInt(h, 16)) as [
          number,
          number,
          number,
        ];
        for (let c = start; c <= end; c++) map.set(c, String.fromCodePoint(base + c - start));
      }
    }
  }
  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1]!.matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>/gi)) {
      map.set(Number.parseInt(m[1]!, 16), utf16(m[2]!));
    }
  }
  return map;
}

/**
 * Recovers the visible text of a pdfkit document: walks every content stream, tracks the active font
 * (`/Fx size Tf`) and maps each 2-byte glyph code back through that font's ToUnicode CMap.
 * Text-show operators are separated by newlines.
 */
export function extractPdfText(pdf: Buffer): string {
  const objects = readObjects(pdf);
  const cmapOfFontObj = new Map<number, Map<number, string>>();
  for (const [num, obj] of objects) {
    const ref = /\/ToUnicode (\d+) 0 R/.exec(obj.dict);
    const cmap = ref ? objects.get(Number(ref[1]))?.stream : undefined;
    if (cmap) cmapOfFontObj.set(num, parseToUnicode(cmap.toString('latin1')));
  }
  const fontByName = new Map<string, Map<number, string>>();
  for (const obj of objects.values()) {
    for (const res of obj.dict.matchAll(/\/Font\s*<<([\s\S]*?)>>/g)) {
      for (const f of res[1]!.matchAll(/\/(\w+)\s+(\d+) 0 R/g)) {
        const cmap = cmapOfFontObj.get(Number(f[2]));
        if (cmap) fontByName.set(f[1]!, cmap);
      }
    }
  }

  const lines: string[] = [];
  for (const obj of objects.values()) {
    const content = obj.stream?.toString('latin1');
    if (!content || !/T[Jj]/.test(content) || !/ Tf/.test(content)) continue;
    let font: Map<number, string> | undefined;
    for (const op of content.matchAll(/\/(\w+)\s+[\d.]+\s+Tf|\[([^\]]*)\]\s*TJ|<([0-9a-fA-F]*)>\s*Tj/g)) {
      if (op[1]) {
        font = fontByName.get(op[1]);
        continue;
      }
      const hexes =
        op[2] !== undefined ? [...op[2].matchAll(/<([0-9a-fA-F]*)>/g)].map((h) => h[1]!) : [op[3]!];
      let text = '';
      for (const hex of hexes) {
        for (let i = 0; i + 4 <= hex.length; i += 4) {
          text += font?.get(Number.parseInt(hex.slice(i, i + 4), 16)) ?? '�';
        }
      }
      lines.push(text);
    }
  }
  return lines.join('\n');
}

export function embeddedFontNames(pdf: Buffer): string[] {
  return [...pdf.toString('latin1').matchAll(/\/BaseFont \/(?:[A-Z]{6}\+)?([\w-]+)/g)].map((m) => m[1]!);
}
