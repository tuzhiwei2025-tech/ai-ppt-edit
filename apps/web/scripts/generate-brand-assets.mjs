import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(root, 'public');
const tmpDir = join(root, '.asset-tmp');

mkdirSync(tmpDir, { recursive: true });

const colors = {
  paper: '#f8f5f0',
  paper2: '#f0e9e0',
  ink: '#3e2723',
  muted: '#6d4c41',
  line: '#e0d6c9',
  green: '#2e7d32',
  greenDark: '#1b5e20',
  mint: '#c8e6c9',
  editor: '#1c2a1f',
  panel: '#2d3a2e',
  white: '#ffffff',
  red: '#ff5f57',
  amber: '#febc2e',
  trafficGreen: '#28c840',
};

const templatePalettes = [
  { name: 'Neon Ops', bg: '#07130f', a: '#39ff88', b: '#00d4ff', c: '#f6fff8', ink: '#dfffee', mood: 'grid' },
  { name: 'Solar Pitch', bg: '#ffefc2', a: '#f97316', b: '#111827', c: '#fff7ed', ink: '#3b1f0a', mood: 'sun' },
  { name: 'Cobalt Flow', bg: '#071a3d', a: '#60a5fa', b: '#a7f3d0', c: '#eff6ff', ink: '#dbeafe', mood: 'wave' },
  { name: 'Rose Glass', bg: '#fff1f2', a: '#e11d48', b: '#fb7185', c: '#ffffff', ink: '#4a1020', mood: 'glass' },
  { name: 'Lime Signal', bg: '#10140b', a: '#a3e635', b: '#22c55e', c: '#f7fee7', ink: '#ecfccb', mood: 'blocks' },
  { name: 'Violet Stage', bg: '#1f1147', a: '#a78bfa', b: '#f0abfc', c: '#faf5ff', ink: '#ede9fe', mood: 'rings' },
  { name: 'Mono Grid', bg: '#f7f3ec', a: '#111827', b: '#6b7280', c: '#ffffff', ink: '#1f2937', mood: 'editorial' },
  { name: 'Aqua Lab', bg: '#e0f7fa', a: '#0891b2', b: '#0f766e', c: '#ffffff', ink: '#083344', mood: 'tiles' },
  { name: 'Ember Deck', bg: '#1c0f0a', a: '#f43f5e', b: '#facc15', c: '#fff7ed', ink: '#ffedd5', mood: 'diagonal' },
  { name: 'Moss Report', bg: '#eef6df', a: '#2e7d32', b: '#1b5e20', c: '#ffffff', ink: '#23351f', mood: 'organic' },
  { name: 'Night Memo', bg: '#0f172a', a: '#38bdf8', b: '#f8fafc', c: '#1e293b', ink: '#e2e8f0', mood: 'code' },
  { name: 'Coral Sync', bg: '#fff7ed', a: '#fb7185', b: '#f97316', c: '#ffffff', ink: '#431407', mood: 'cards' },
  { name: 'Mint Finance', bg: '#ecfdf5', a: '#059669', b: '#064e3b', c: '#ffffff', ink: '#052e16', mood: 'chart' },
  { name: 'Steel AI', bg: '#e5e7eb', a: '#334155', b: '#0ea5e9', c: '#ffffff', ink: '#111827', mood: 'metal' },
  { name: 'Pop Deck', bg: '#fef3c7', a: '#ef4444', b: '#2563eb', c: '#ffffff', ink: '#111827', mood: 'pop' },
  { name: 'Quiet Luxury', bg: '#18120d', a: '#d4af37', b: '#f8f5f0', c: '#2a2119', ink: '#f5ead6', mood: 'lux' },
  { name: 'Data Pulse', bg: '#061b1a', a: '#14b8a6', b: '#f59e0b', c: '#ecfeff', ink: '#ccfbf1', mood: 'pulse' },
  { name: 'Paper Zine', bg: '#fbf7ef', a: '#dc2626', b: '#111827', c: '#ffffff', ink: '#2b211c', mood: 'zine' },
  { name: 'Blue Aurora', bg: '#e0f2fe', a: '#1d4ed8', b: '#7dd3fc', c: '#ffffff', ink: '#172554', mood: 'aurora' },
  { name: 'Matrix Brief', bg: '#050807', a: '#00ff85', b: '#14532d', c: '#dcfce7', ink: '#bbf7d0', mood: 'matrix' },
];

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function svg(width, height, content, attrs = '', viewWidth = width, viewHeight = height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${viewWidth} ${viewHeight}" fill="none" ${attrs}>${content}</svg>`;
}

function write(path, content) {
  writeFileSync(join(publicDir, path), content.replace(/[ \t]+$/gm, ''));
}

function renderPng(path, width, height, content, viewWidth = width, viewHeight = height) {
  const src = join(tmpDir, `${path.replaceAll('/', '-').replaceAll('.', '-')}.svg`);
  const out = join(publicDir, path);
  writeFileSync(src, svg(width, height, content, '', viewWidth, viewHeight));
  execFileSync('sips', ['-s', 'format', 'png', src, '--out', out], { stdio: 'ignore' });
}

function makeIco(pngPaths, outPath) {
  const images = pngPaths.map((path) => readFileSync(join(publicDir, path)));
  const headerSize = 6 + images.length * 16;
  const total = headerSize + images.reduce((sum, image) => sum + image.length, 0);
  const ico = Buffer.alloc(total);
  let offset = 0;
  ico.writeUInt16LE(0, offset); offset += 2;
  ico.writeUInt16LE(1, offset); offset += 2;
  ico.writeUInt16LE(images.length, offset); offset += 2;
  let dataOffset = headerSize;
  images.forEach((image, index) => {
    const size = Number(pngPaths[index].match(/favicon-(\d+)\.png/)?.[1] ?? 32);
    ico.writeUInt8(size >= 256 ? 0 : size, offset); offset += 1;
    ico.writeUInt8(size >= 256 ? 0 : size, offset); offset += 1;
    ico.writeUInt8(0, offset); offset += 1;
    ico.writeUInt8(0, offset); offset += 1;
    ico.writeUInt16LE(1, offset); offset += 2;
    ico.writeUInt16LE(32, offset); offset += 2;
    ico.writeUInt32LE(image.length, offset); offset += 4;
    ico.writeUInt32LE(dataOffset, offset); offset += 4;
    image.copy(ico, dataOffset);
    dataOffset += image.length;
  });
  writeFileSync(join(publicDir, outPath), ico);
}

function brandMark({ rounded = true, square = false, maskable = false } = {}) {
  const radius = square ? 0 : rounded ? 112 : 0;
  const inset = maskable ? 36 : 0;
  const size = 512 - inset * 2;
  return `
    <defs>
      <linearGradient id="mark-bg" x1="64" y1="42" x2="448" y2="470" gradientUnits="userSpaceOnUse">
        <stop stop-color="${colors.greenDark}"/>
        <stop offset=".58" stop-color="${colors.editor}"/>
        <stop offset="1" stop-color="#0b160d"/>
      </linearGradient>
      <linearGradient id="mark-card" x1="130" y1="126" x2="382" y2="362" gradientUnits="userSpaceOnUse">
        <stop stop-color="${colors.white}"/>
        <stop offset="1" stop-color="${colors.paper2}"/>
      </linearGradient>
      <linearGradient id="mark-line" x1="176" y1="328" x2="352" y2="178" gradientUnits="userSpaceOnUse">
        <stop stop-color="${colors.green}"/>
        <stop offset="1" stop-color="${colors.mint}"/>
      </linearGradient>
      <filter id="mark-shadow" x="84" y="92" width="350" height="320" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#000000" flood-opacity=".3"/>
      </filter>
    </defs>
    <rect x="${inset}" y="${inset}" width="${size}" height="${size}" rx="${radius}" fill="url(#mark-bg)"/>
    <rect x="${inset + 22}" y="${inset + 22}" width="${size - 44}" height="${size - 44}" rx="${Math.max(radius - 22, 0)}" stroke="${colors.mint}" stroke-opacity=".18" stroke-width="6"/>
    <g filter="url(#mark-shadow)">
      <rect x="122" y="144" width="240" height="160" rx="28" fill="${colors.mint}" opacity=".32" transform="rotate(-9 242 224)"/>
      <rect x="158" y="118" width="240" height="160" rx="28" fill="${colors.paper2}" opacity=".72" transform="rotate(8 278 198)"/>
      <rect x="132" y="176" width="248" height="174" rx="30" fill="url(#mark-card)"/>
      <path d="M176 226h134M176 266h86" stroke="${colors.editor}" stroke-width="18" stroke-linecap="round" opacity=".88"/>
      <path d="M184 330 348 188" stroke="url(#mark-line)" stroke-width="30" stroke-linecap="round"/>
      <path d="m336 178 38 18-18 38-18-20-22 22-18-18 22-22-20-18Z" fill="${colors.mint}"/>
    </g>
  `;
}

function lockupSvg() {
  return svg(900, 240, `
    <g transform="translate(20 20) scale(.390625)">
      ${brandMark({ rounded: true })}
    </g>
    <text x="250" y="124" font-family="Montserrat, Avenir Next, Helvetica Neue, Arial, sans-serif" font-size="78" font-weight="900" fill="${colors.ink}">AI PPT Edit</text>
    <text x="254" y="174" font-family="Source Code Pro, Menlo, monospace" font-size="25" font-weight="700" letter-spacing="2.4" fill="${colors.green}">HTML DECK WORKBENCH</text>
  `);
}

function ogContent(width, height) {
  return `
    <defs>
      <linearGradient id="og-bg" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
        <stop stop-color="${colors.paper}"/>
        <stop offset=".68" stop-color="${colors.paper2}"/>
        <stop offset="1" stop-color="${colors.mint}"/>
      </linearGradient>
      <pattern id="og-grid" width="48" height="48" patternUnits="userSpaceOnUse">
        <path d="M48 0H0v48" stroke="${colors.ink}" stroke-opacity=".06" stroke-width="2"/>
      </pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#og-bg)"/>
    <rect width="${width}" height="${height}" fill="url(#og-grid)"/>
    <g transform="translate(72 72)">
      <g transform="scale(.25)">${brandMark({ rounded: true })}</g>
      <text x="154" y="54" font-family="Montserrat, Avenir Next, Helvetica Neue, Arial, sans-serif" font-size="42" font-weight="900" fill="${colors.ink}">AI PPT Edit</text>
      <text x="156" y="94" font-family="Source Code Pro, Menlo, monospace" font-size="18" font-weight="700" fill="${colors.green}">HTML DECKS TO PPTX / PDF</text>
    </g>
    <text x="76" y="286" font-family="Montserrat, Avenir Next, Helvetica Neue, Arial, sans-serif" font-size="74" font-weight="900" fill="${colors.ink}">Edit AI-generated</text>
    <text x="76" y="370" font-family="Montserrat, Avenir Next, Helvetica Neue, Arial, sans-serif" font-size="74" font-weight="900" fill="${colors.green}">decks in browser</text>
    <text x="80" y="438" font-family="Merriweather, Georgia, serif" font-size="28" fill="${colors.muted}">Trim, preview, and export pixel-perfect presentation files.</text>
    <g transform="translate(760 126) rotate(-5)">
      ${miniEditor(340, 380, 'Export', true)}
    </g>
  `;
}

function templateCard(palette, index) {
  const title = palette.name.toUpperCase();
  const number = String(index + 1).padStart(2, '0');
  const commonDefs = `
    <defs>
      <linearGradient id="tpl-bg-${index}" x1="0" y1="0" x2="600" y2="850" gradientUnits="userSpaceOnUse">
        <stop stop-color="${palette.bg}"/>
        <stop offset=".55" stop-color="${palette.a}"/>
        <stop offset="1" stop-color="${palette.b}"/>
      </linearGradient>
      <radialGradient id="tpl-glow-${index}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(150 140) rotate(56) scale(520)">
        <stop stop-color="${palette.c}" stop-opacity=".58"/>
        <stop offset="1" stop-color="${palette.c}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="tpl-grid-${index}" width="44" height="44" patternUnits="userSpaceOnUse">
        <path d="M44 0H0v44" stroke="${palette.c}" stroke-opacity=".16" stroke-width="2"/>
      </pattern>
    </defs>
  `;
  const motif = {
    grid: `<rect width="600" height="850" fill="url(#tpl-grid-${index})"/><path d="M90 610h420M90 665h250M90 720h330" stroke="${palette.c}" stroke-width="18" stroke-linecap="round"/><rect x="78" y="120" width="360" height="260" rx="18" fill="${palette.a}" opacity=".32"/><path d="M120 328l112-130 82 80 64-96 94 146" stroke="${palette.a}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`,
    sun: `<circle cx="420" cy="208" r="136" fill="${palette.a}"/><circle cx="420" cy="208" r="86" fill="${palette.c}" opacity=".74"/><path d="M68 520h460" stroke="${palette.b}" stroke-width="30"/><path d="M68 586h330" stroke="${palette.a}" stroke-width="24"/><rect x="74" y="650" width="178" height="82" rx="16" fill="${palette.b}"/>`,
    wave: `<path d="M-20 530C110 398 220 674 354 524s210-78 286-176v502H-20Z" fill="${palette.a}" opacity=".72"/><path d="M-24 640C122 492 226 734 386 590c100-90 172-84 254-158v418H-24Z" fill="${palette.b}" opacity=".74"/><path d="M82 184h320M82 242h218" stroke="${palette.c}" stroke-width="22" stroke-linecap="round"/>`,
    glass: `<rect x="72" y="118" width="374" height="470" rx="34" fill="${palette.c}" opacity=".46"/><rect x="126" y="196" width="360" height="470" rx="34" fill="${palette.c}" opacity=".38"/><path d="M112 704h292" stroke="${palette.a}" stroke-width="28" stroke-linecap="round"/><circle cx="430" cy="168" r="74" fill="${palette.b}" opacity=".8"/>`,
    blocks: `<rect x="70" y="112" width="190" height="260" rx="16" fill="${palette.a}"/><rect x="292" y="112" width="238" height="118" rx="16" fill="${palette.c}"/><rect x="292" y="260" width="238" height="288" rx="16" fill="${palette.b}"/><rect x="70" y="404" width="190" height="144" rx="16" fill="${palette.c}"/><path d="M76 674h390" stroke="${palette.a}" stroke-width="22" stroke-linecap="round"/>`,
    rings: `<circle cx="306" cy="352" r="190" stroke="${palette.a}" stroke-width="36"/><circle cx="306" cy="352" r="108" stroke="${palette.c}" stroke-width="28" opacity=".8"/><circle cx="306" cy="352" r="36" fill="${palette.b}"/><path d="M82 686h322M82 738h188" stroke="${palette.c}" stroke-width="18" stroke-linecap="round"/>`,
    editorial: `<rect x="76" y="112" width="448" height="148" fill="${palette.a}"/><rect x="76" y="294" width="206" height="342" fill="${palette.c}"/><rect x="318" y="294" width="206" height="342" fill="${palette.b}" opacity=".35"/><path d="M76 704h448M76 748h286" stroke="${palette.a}" stroke-width="20"/>`,
    tiles: `<g transform="rotate(-8 300 425)"><rect x="74" y="136" width="190" height="250" rx="20" fill="${palette.c}"/><rect x="298" y="110" width="190" height="250" rx="20" fill="${palette.a}"/><rect x="112" y="424" width="190" height="250" rx="20" fill="${palette.b}"/><rect x="336" y="398" width="190" height="250" rx="20" fill="${palette.c}" opacity=".78"/></g>`,
    diagonal: `<path d="M0 170 600 0v248L0 418Z" fill="${palette.a}"/><path d="M0 500 600 318v156L0 666Z" fill="${palette.b}"/><path d="M90 720h330" stroke="${palette.c}" stroke-width="26" stroke-linecap="round"/>`,
    organic: `<path d="M118 206c110-160 330-80 340 84 14 204-194 314-322 196-78-72-80-188-18-280Z" fill="${palette.a}" opacity=".88"/><path d="M158 618c76-72 198-82 298-22" stroke="${palette.b}" stroke-width="24" stroke-linecap="round"/><circle cx="424" cy="224" r="42" fill="${palette.c}"/>`,
    code: `<rect x="70" y="136" width="460" height="424" rx="20" fill="${palette.c}" opacity=".16"/><path d="M128 220h128M128 280h300M128 340h214M128 400h344" stroke="${palette.a}" stroke-width="18" stroke-linecap="round"/><path d="m164 656-72-72 72-72M436 512l72 72-72 72" stroke="${palette.b}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`,
    cards: `<rect x="92" y="164" width="340" height="452" rx="28" fill="${palette.c}" transform="rotate(-8 262 390)"/><rect x="168" y="128" width="340" height="452" rx="28" fill="${palette.a}" transform="rotate(8 338 354)" opacity=".92"/><path d="M98 704h390" stroke="${palette.b}" stroke-width="24" stroke-linecap="round"/>`,
    chart: `<rect x="82" y="158" width="436" height="424" rx="24" fill="${palette.c}"/><path d="M134 506V390M236 506V270M338 506V342M440 506V210" stroke="${palette.a}" stroke-width="42" stroke-linecap="round"/><path d="M120 664h356" stroke="${palette.b}" stroke-width="24" stroke-linecap="round"/>`,
    metal: `<path d="M84 150h432v520H84Z" fill="${palette.c}" opacity=".72"/><path d="M84 260h432M216 150v520M372 150v520" stroke="${palette.b}" stroke-width="12" opacity=".6"/><path d="M122 728h356" stroke="${palette.a}" stroke-width="22" stroke-linecap="round"/>`,
    pop: `<circle cx="170" cy="210" r="94" fill="${palette.a}"/><rect x="260" y="130" width="220" height="220" rx="28" fill="${palette.b}"/><path d="M82 480h436v132H82Z" fill="${palette.c}"/><path d="M104 704h260" stroke="${palette.a}" stroke-width="30" stroke-linecap="round"/>`,
    lux: `<rect x="86" y="126" width="428" height="568" rx="2" fill="${palette.c}" stroke="${palette.a}" stroke-width="8"/><path d="M138 216h324M138 290h190M138 626h262" stroke="${palette.a}" stroke-width="18" stroke-linecap="round"/><circle cx="410" cy="432" r="72" stroke="${palette.a}" stroke-width="16"/>`,
    pulse: `<path d="M64 432h116l44-132 86 264 66-188h160" stroke="${palette.a}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/><rect x="76" y="142" width="448" height="120" rx="20" fill="${palette.c}" opacity=".16"/><path d="M96 704h390" stroke="${palette.b}" stroke-width="24" stroke-linecap="round"/>`,
    zine: `<path d="M74 128h452v596H74Z" fill="${palette.c}"/><path d="M112 168h180v218H112ZM326 168h160v82H326ZM326 286h160v100H326ZM112 430h374v88H112Z" fill="${palette.b}"/><path d="M112 606h282" stroke="${palette.a}" stroke-width="26" stroke-linecap="round"/>`,
    aurora: `<path d="M0 620c110-190 186-260 300-210 112 48 146-136 300-226v666H0Z" fill="${palette.a}" opacity=".72"/><path d="M0 700c170-170 248-178 360-94 86 64 158-16 240-78v322H0Z" fill="${palette.b}" opacity=".78"/><path d="M86 172h336M86 230h196" stroke="${palette.ink}" stroke-width="20" stroke-linecap="round"/>`,
    matrix: `<rect width="600" height="850" fill="url(#tpl-grid-${index})"/><path d="M96 154h360M96 218h224M96 640h408M96 704h260" stroke="${palette.a}" stroke-width="18" stroke-linecap="round"/><rect x="98" y="296" width="404" height="240" rx="18" fill="${palette.b}" opacity=".64"/><path d="M150 480h300M150 426h210M150 372h260" stroke="${palette.a}" stroke-width="14" stroke-linecap="round"/>`,
  }[palette.mood];

  return `
    ${commonDefs}
    <rect width="600" height="850" rx="36" fill="url(#tpl-bg-${index})"/>
    <rect width="600" height="850" rx="36" fill="url(#tpl-glow-${index})"/>
    ${motif}
    <text x="62" y="80" font-family="Source Code Pro, Menlo, monospace" font-size="22" font-weight="800" fill="${palette.ink}" opacity=".9">${number}</text>
    <text x="62" y="806" font-family="Montserrat, Avenir Next, Helvetica Neue, Arial, sans-serif" font-size="26" font-weight="900" fill="${palette.ink}">${esc(title)}</text>
  `;
}

function miniEditor(width, height, label = 'AI PPT Edit', dense = false) {
  const sidebar = Math.round(width * .24);
  const panel = Math.round(width * .24);
  const slideX = sidebar + 26;
  const slideW = width - sidebar - panel - 52;
  const slideH = Math.round(slideW * .58);
  const slideY = Math.round(height * .25);
  const lines = dense ? 6 : 4;
  return `
    <rect width="${width}" height="${height}" rx="8" fill="${colors.paper}" stroke="${colors.ink}" stroke-opacity=".22" stroke-width="2"/>
    <rect width="${width}" height="42" rx="8" fill="${colors.paper2}"/>
    <circle cx="22" cy="21" r="6" fill="${colors.red}"/>
    <circle cx="44" cy="21" r="6" fill="${colors.amber}"/>
    <circle cx="66" cy="21" r="6" fill="${colors.trafficGreen}"/>
    <text x="94" y="27" font-family="Source Code Pro, Menlo, monospace" font-size="13" font-weight="700" fill="${colors.green}">${esc(label)}</text>
    <rect y="42" width="${sidebar}" height="${height - 42}" fill="${colors.paper2}"/>
    <rect x="${width - panel}" y="42" width="${panel}" height="${height - 42}" fill="${colors.paper2}"/>
    ${Array.from({ length: lines }, (_, index) => {
      const y = 66 + index * 42;
      return `<rect x="18" y="${y}" width="${sidebar - 36}" height="28" rx="5" fill="${index === 1 ? colors.mint : colors.paper}" stroke="${colors.line}" stroke-width="2"/>`;
    }).join('')}
    <rect x="${slideX}" y="${slideY}" width="${slideW}" height="${slideH}" rx="7" fill="${colors.editor}"/>
    <rect x="${slideX + 18}" y="${slideY + 22}" width="${slideW * .58}" height="18" rx="4" fill="${colors.mint}"/>
    <rect x="${slideX + 18}" y="${slideY + 56}" width="${slideW * .72}" height="8" rx="4" fill="${colors.white}" opacity=".58"/>
    <rect x="${slideX + 18}" y="${slideY + 76}" width="${slideW * .5}" height="8" rx="4" fill="${colors.white}" opacity=".32"/>
    <rect x="${slideX + slideW * .64}" y="${slideY + slideH * .44}" width="${slideW * .23}" height="${slideW * .23}" rx="8" fill="${colors.green}"/>
    <path d="M${slideX + slideW * .69} ${slideY + slideH * .53}h${slideW * .12}M${slideX + slideW * .75} ${slideY + slideH * .47}v${slideW * .12}" stroke="${colors.white}" stroke-width="6" stroke-linecap="round"/>
    <rect x="${width - panel + 18}" y="70" width="${panel - 36}" height="12" rx="6" fill="${colors.ink}" opacity=".18"/>
    <rect x="${width - panel + 18}" y="102" width="${panel - 54}" height="10" rx="5" fill="${colors.green}" opacity=".72"/>
    <rect x="${width - panel + 18}" y="132" width="${panel - 44}" height="10" rx="5" fill="${colors.ink}" opacity=".14"/>
    <rect x="${width - panel + 18}" y="${height - 72}" width="${panel - 36}" height="30" rx="6" fill="${colors.green}"/>
  `;
}

function guideGenerate() {
  return `
    <rect width="1536" height="1024" fill="${colors.paper}"/>
    <rect width="1536" height="1024" fill="url(#guide-grid)"/>
    <text x="110" y="168" font-family="Montserrat, Avenir Next, Helvetica Neue, Arial, sans-serif" font-size="76" font-weight="900" fill="${colors.ink}">Generate</text>
    <text x="114" y="220" font-family="Source Code Pro, Menlo, monospace" font-size="26" font-weight="700" fill="${colors.green}">PROMPT TO HTML DECK</text>
    <g transform="translate(110 306)">${promptPanel(510, 500)}</g>
    <g transform="translate(704 178)">${miniEditor(690, 628, 'deck.html')}</g>
  `;
}

function promptPanel(width, height) {
  return `
    <rect width="${width}" height="${height}" rx="8" fill="${colors.editor}"/>
    <rect x="24" y="26" width="150" height="18" rx="9" fill="${colors.mint}"/>
    <rect x="24" y="78" width="${width - 48}" height="${height - 150}" rx="8" fill="#162118"/>
    ${Array.from({ length: 7 }, (_, i) => `<rect x="52" y="${112 + i * 38}" width="${300 + (i % 3) * 42}" height="12" rx="6" fill="${i % 2 ? colors.white : colors.mint}" opacity="${i % 2 ? .32 : .82}"/>`).join('')}
    <rect x="24" y="${height - 50}" width="172" height="28" rx="6" fill="${colors.green}"/>
    <path d="M390 ${height - 36}h74" stroke="${colors.mint}" stroke-width="10" stroke-linecap="round"/>
  `;
}

function guideEdit() {
  return `
    <rect width="1536" height="1024" fill="${colors.paper2}"/>
    <rect width="1536" height="1024" fill="url(#guide-grid)"/>
    <g transform="translate(112 132)">${miniEditor(820, 710, 'visual editor', true)}</g>
    <g transform="translate(1000 186)">
      <rect width="388" height="588" rx="8" fill="${colors.paper}" stroke="${colors.ink}" stroke-opacity=".18" stroke-width="2"/>
      <text x="34" y="76" font-family="Montserrat, Avenir Next, Helvetica Neue, Arial, sans-serif" font-size="48" font-weight="900" fill="${colors.ink}">Edit</text>
      <rect x="34" y="122" width="258" height="14" rx="7" fill="${colors.green}"/>
      <rect x="34" y="166" width="300" height="12" rx="6" fill="${colors.ink}" opacity=".18"/>
      <rect x="34" y="198" width="222" height="12" rx="6" fill="${colors.ink}" opacity=".18"/>
      <rect x="34" y="274" width="138" height="44" rx="7" fill="${colors.green}"/>
      <rect x="190" y="274" width="138" height="44" rx="7" fill="${colors.paper2}" stroke="${colors.line}" stroke-width="2"/>
      <path d="M70 414l92 42 42 92 54-246-246 54 92 42-34 16Z" fill="${colors.green}" opacity=".92"/>
    </g>
  `;
}

function guideExport() {
  return `
    <rect width="1536" height="1024" fill="${colors.paper}"/>
    <rect width="1536" height="1024" fill="url(#guide-grid)"/>
    <g transform="translate(112 150)">
      <text x="0" y="66" font-family="Montserrat, Avenir Next, Helvetica Neue, Arial, sans-serif" font-size="76" font-weight="900" fill="${colors.ink}">Export</text>
      <text x="4" y="118" font-family="Source Code Pro, Menlo, monospace" font-size="26" font-weight="700" fill="${colors.green}">PPTX / PDF READY</text>
      <g transform="translate(0 190)">${miniEditor(650, 560, 'preview')}</g>
    </g>
    <g transform="translate(840 230)">
      <rect width="420" height="540" rx="8" fill="${colors.editor}"/>
      <rect x="42" y="54" width="180" height="20" rx="10" fill="${colors.mint}"/>
      <rect x="42" y="112" width="336" height="310" rx="8" fill="${colors.paper}"/>
      <rect x="78" y="156" width="210" height="18" rx="9" fill="${colors.green}"/>
      <rect x="78" y="206" width="246" height="12" rx="6" fill="${colors.ink}" opacity=".22"/>
      <rect x="78" y="238" width="168" height="12" rx="6" fill="${colors.ink}" opacity=".22"/>
      <rect x="78" y="330" width="120" height="42" rx="7" fill="${colors.green}"/>
      <rect x="220" y="330" width="120" height="42" rx="7" fill="${colors.paper2}" stroke="${colors.line}" stroke-width="2"/>
      <path d="M236 472h100m-50-50v96m0 0-34-34m34 34 34-34" stroke="${colors.mint}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;
}

function guideDefs(content) {
  return `
    <defs>
      <pattern id="guide-grid" width="48" height="48" patternUnits="userSpaceOnUse">
        <path d="M48 0H0v48" stroke="${colors.ink}" stroke-opacity=".055" stroke-width="2"/>
      </pattern>
    </defs>
    ${content}
  `;
}

write('logo-mark.svg', svg(512, 512, brandMark({ rounded: true })));
write('favicon.svg', svg(512, 512, brandMark({ rounded: true })));
write('icon-square.svg', svg(512, 512, brandMark({ square: true })));
write('logo-lockup.svg', lockupSvg());
write('og-image.svg', svg(1200, 630, ogContent(1200, 630)));
write('icons.svg', svg(512, 512, brandMark({ rounded: true })));

renderPng('brand-n.png', 512, 512, brandMark({ rounded: true }));
renderPng('icon-512.png', 512, 512, brandMark({ rounded: true }));
renderPng('maskable-512.png', 512, 512, brandMark({ rounded: true, maskable: true }));
renderPng('icon-192.png', 192, 192, brandMark({ rounded: true }), 512, 512);
renderPng('apple-touch-icon.png', 180, 180, brandMark({ rounded: true }), 512, 512);
renderPng('favicon-32.png', 32, 32, brandMark({ rounded: true }), 512, 512);
renderPng('favicon-16.png', 16, 16, brandMark({ rounded: true }), 512, 512);
renderPng('og-image.png', 1200, 630, ogContent(1200, 630));
renderPng('guide-step-generate.png', 1536, 1024, guideDefs(guideGenerate()));
renderPng('guide-step-edit.png', 1536, 1024, guideDefs(guideEdit()));
renderPng('guide-step-export.png', 1536, 1024, guideDefs(guideExport()));
templatePalettes.forEach((palette, index) => {
  renderPng(`template-card-${String(index + 1).padStart(2, '0')}.png`, 600, 850, templateCard(palette, index));
});

makeIco(['favicon-16.png', 'favicon-32.png'], 'favicon.ico');

rmSync(tmpDir, { recursive: true, force: true });
