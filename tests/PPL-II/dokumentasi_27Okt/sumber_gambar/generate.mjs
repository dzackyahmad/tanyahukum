/**
 * PlantUML Diagram Generator — gambar_baru/
 * Membaca semua file .puml di src/, extract tiap diagram, generate PNG + SVG
 * via PlantUML public server, simpan flat di png/ dan svg/ (bukan subfolder).
 *
 * Cara pakai:
 *   node generate.mjs
 *   node generate.mjs --format png
 *   node generate.mjs --file src/diagrams_new.puml
 */

import { createWriteStream, mkdirSync, readFileSync, existsSync, readdirSync } from 'fs';
import { deflateRaw } from 'zlib';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { pipeline } from 'stream';

const deflateRawAsync = promisify(deflateRaw);
const streamPipeline = promisify(pipeline);
const __dirname = dirname(fileURLToPath(import.meta.url));

const PLANTUML_SERVER = 'https://www.plantuml.com/plantuml';
const SRC_DIR = join(__dirname, 'puml');
const PNG_DIR = join(__dirname, '..', 'gambar', 'diagram');
const SVG_DIR = join(__dirname, 'svg');

const PLANTUML_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

function encode6bit(b) {
  return PLANTUML_CHARS[b & 0x3F];
}
function append3bytes(b1, b2, b3) {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3F;
  return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
}
function encodeBuffer(buffer) {
  let result = '';
  for (let i = 0; i < buffer.length; i += 3) {
    result += append3bytes(buffer[i] ?? 0, buffer[i + 1] ?? 0, buffer[i + 2] ?? 0);
  }
  return result;
}
async function encodeDiagram(text) {
  const compressed = await deflateRawAsync(Buffer.from(text, 'utf8'), { level: 9 });
  return encodeBuffer(compressed);
}

function extractDiagrams(fileContent) {
  const diagrams = [];
  const regex = /@startuml[ \t]+(\S+)([\s\S]*?)@enduml/g;
  let match;
  while ((match = regex.exec(fileContent)) !== null) {
    diagrams.push({ name: match[1].trim(), content: match[0].trim() });
  }
  return diagrams;
}

async function generateImage(diagram, format, outputDir) {
  const encoded = await encodeDiagram(diagram.content);
  const url = `${PLANTUML_SERVER}/${format}/${encoded}`;
  const filePath = join(outputDir, `${diagram.name}.${format}`);
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Server returned ${response.status} ${response.statusText} :: ${body.slice(0, 300)}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/plain') || contentType.includes('text/html')) {
    const body = await response.text();
    throw new Error(`Diagram error: ${body.slice(0, 200).replace(/\n/g, ' ')}`);
  }
  const fileStream = createWriteStream(filePath);
  await streamPipeline(response.body, fileStream);
  return filePath;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { formats: ['png', 'svg'], files: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) opts.formats = [args[++i]];
    if (args[i] === '--file' && args[i + 1]) opts.files = [args[++i]];
  }
  return opts;
}

const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', DIM = '\x1b[2m', RESET = '\x1b[0m';
function pad(str, len) { return str.length >= len ? str : str + ' '.repeat(len - str.length); }

async function main() {
  const opts = parseArgs();
  mkdirSync(PNG_DIR, { recursive: true });
  mkdirSync(SVG_DIR, { recursive: true });

  const targetFiles = opts.files ?? readdirSync(SRC_DIR).filter((f) => f.endsWith('.puml')).map((f) => join('src', f));
  let totalSuccess = 0, totalFail = 0;
  const failures = [];

  for (const relPath of targetFiles) {
    const filePath = relPath.startsWith(SRC_DIR) || relPath.includes('/') || relPath.includes('\\')
      ? join(__dirname, relPath)
      : join(SRC_DIR, relPath);
    if (!existsSync(filePath)) {
      console.log(`${YELLOW}⚠  File tidak ditemukan: ${filePath}${RESET}`);
      continue;
    }
    const content = readFileSync(filePath, 'utf8');
    const diagrams = extractDiagrams(content);
    if (diagrams.length === 0) {
      console.log(`${YELLOW}⚠  Tidak ada diagram di ${basename(filePath)}${RESET}`);
      continue;
    }
    console.log(`${CYAN}📄 ${basename(filePath)}${RESET} ${DIM}(${diagrams.length} diagram)${RESET}`);
    console.log('─'.repeat(60));
    for (const diagram of diagrams) {
      process.stdout.write(`  ${pad(diagram.name, 36)}`);
      const results = [];
      for (const format of opts.formats) {
        const outDir = format === 'png' ? PNG_DIR : SVG_DIR;
        try {
          await generateImage(diagram, format, outDir);
          results.push(`${GREEN}${format.toUpperCase()}✓${RESET}`);
          totalSuccess++;
        } catch (err) {
          results.push(`${RED}${format.toUpperCase()}✗${RESET}`);
          totalFail++;
          failures.push({ name: diagram.name, format, error: err.message });
          process.stdout.write(`\n${' '.repeat(38)}${RED}Error: ${err.message.slice(0, 150)}${RESET}`);
        }
      }
      console.log(`  ${results.join('  ')}`);
    }
    console.log('');
  }

  console.log('─'.repeat(60));
  console.log(`\n${GREEN}✅ Berhasil : ${totalSuccess}${RESET}`);
  if (totalFail > 0) {
    console.log(`${RED}❌ Gagal    : ${totalFail}${RESET}`);
    for (const f of failures) console.log(`${RED}  - ${f.name} (${f.format}): ${f.error}${RESET}`);
  }
}

main().catch((err) => {
  console.error(`\n${RED}Fatal error: ${err.message}${RESET}`);
  process.exit(1);
});
