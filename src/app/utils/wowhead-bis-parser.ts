export interface WowheadBisItem {
  slot: string;
  itemId: number;
  source: string;
}

export function extractWowheadBisList(
  scrapedPage: string,
  tabName: string = 'Overall'
): WowheadBisItem[] {
  const markup = extractWowheadMarkupPayload(scrapedPage);
  const tabBlock = extractTabBlock(markup, tabName) ?? markup;
  const gearTable = extractMainBisGearTable(tabBlock) ?? tabBlock;

  const rowRegex = /\[tr\]([\s\S]*?)\[\/tr\]/g;
  const items: WowheadBisItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(gearTable)) !== null) {
    const row = match[1] ?? '';
    const cells = extractTdCells(row);
    if (cells.length < 3) {
      continue;
    }

    const slot = normalizeSlot(cleanWowheadCellText(cells[0]));
    if (!slot || /^slot$/i.test(slot)) {
      continue;
    }

    // Some tables are 4 columns (slot, enchant, item, source), others 3 (slot, item, source).
    const itemCell = cells.find((cell) => /\[item=\d+/i.test(cell)) ?? '';
    const sourceCell = cells[cells.length - 1] ?? '';
    const itemId = extractItemId(itemCell);
    const source = cleanWowheadCellText(sourceCell);

    if (!slot || Number.isNaN(itemId) || itemId <= 0) {
      continue;
    }

    items.push({ slot, itemId, source });
  }

  return items;
}

function extractMainBisGearTable(tabBlock: string): string | null {
  // Try to anchor to the main "Best in Slot Gear" heading first, then take the first table.
  const headingRegex = /\[h3[^\]]*\][^\[]*Best in Slot Gear[^\[]*\[\/h3\]/i;
  const headingMatch = tabBlock.match(headingRegex);
  const searchStart = headingMatch?.index ?? 0;
  const slice = tabBlock.slice(searchStart);

  const tableMatch = slice.match(/\[table[^\]]*\][\s\S]*?\[\/table\]/i);
  return tableMatch ? tableMatch[0] : null;
}

function extractWowheadMarkupPayload(page: string): string {
  const marker = 'WH.markup.printHtml("';
  const start = page.indexOf(marker);
  if (start === -1) {
    throw new Error('Could not locate WH.markup.printHtml payload.');
  }

  const contentStart = start + marker.length;
  let i = contentStart;
  let escaped = false;
  let raw = '';

  while (i < page.length) {
    const ch = page[i];

    if (!escaped && ch === '"') {
      // End of JS string literal.
      break;
    }

    if (escaped) {
      raw += '\\' + ch;
      escaped = false;
    } else if (ch === '\\') {
      escaped = true;
    } else {
      raw += ch;
    }

    i++;
  }

  if (i >= page.length) {
    throw new Error('Unterminated WH.markup.printHtml payload.');
  }

  return decodeJsEscapedString(raw);
}

function decodeJsEscapedString(value: string): string {
  return value
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');
}

function extractTabBlock(markup: string, tabName: string): string | null {
  const escapedTab = escapeRegex(tabName);
  const tabRegex = new RegExp(`\\[tab name="${escapedTab}"[^\\]]*\\][\\s\\S]*?\\[\\/tab\\]`, 'i');
  const match = markup.match(tabRegex);
  return match ? match[0] : null;
}

function normalizeSlot(slot: string): string {
  return slot
    .replace(/ring\s*1/gi, 'Ring')
    .replace(/ring\s*2/gi, 'Ring')
    .replace(/one-hand weapon/gi, 'One-Hand Weapon')
    .replace(/two-hand weapon/gi, 'Two-Hand Weapon')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractItemId(itemCell: string): number {
  const match = itemCell.match(/\[item=(\d+)/i);
  if (!match) {
    return NaN;
  }
  return Number(match[1]);
}

function cleanWowheadCellText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTdCells(row: string): string[] {
  const cells: string[] = [];
  const tdRegex = /\[td[^\]]*\]([\s\S]*?)\[\/td\]/gi;
  let tdMatch: RegExpExecArray | null;

  while ((tdMatch = tdRegex.exec(row)) !== null) {
    cells.push(tdMatch[1] ?? '');
  }

  return cells;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
