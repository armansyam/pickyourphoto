import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const testDir = path.resolve('./scratch/test_format_agnostic');
if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
}
fs.mkdirSync(testDir, { recursive: true });

// Mock diverse camera RAW files and metadata sidecars
const mockFiles = [
    'DSC0100.ARW',      // Sony RAW
    'DSC0100.xmp',      // Lightroom sidecar
    'IMG_5500.CR3',     // Canon RAW
    'NIK_9000.NEF',     // Nikon RAW
    'FUJI_123.RAF',     // Fuji RAW
    'DRONE_88.DNG',     // Leica/Drone RAW
    'PHONE_99.HEIC',    // iPhone RAW/HEIC
    'UNSELECTED_01.ARW' // Should NOT be sorted
];

for (const f of mockFiles) {
    fs.writeFileSync(path.join(testDir, f), 'data ' + f);
}

// Client selects JPEG versions of these photos:
const clientSelections = [
    'DSC0100.jpg',
    'IMG_5500.JPG',
    'NIK_9000.jpeg',
    'FUJI_123.jpg',
    'DRONE_88.jpg',
    'PHONE_99.jpg'
];

const filesList = clientSelections.map(f => {
    const dot = f.lastIndexOf('.');
    const base = dot > 0 ? f.substring(0, dot) : f;
    return `  "${base}"`;
}).join('\n');

const macScript = `#!/bin/bash
cd "$(dirname "$0")"
TARGET_DIR="FOTO_TERPILIH_KLIEN"
mkdir -p "$TARGET_DIR"

FILES=(
${filesList}
)

SUCCESS=0
NOT_FOUND=0

shopt -s nullglob nocaseglob 2>/dev/null

for base in "\${FILES[@]}"; do
  MATCHED=0
  for f in "$base".* ; do
    if [ -f "$f" ]; then
      EXT="\${f##*.}"
      if [[ "$EXT" =~ ^(command|bat|sh|txt)$ ]]; then
        continue
      fi
      cp -n "$f" "$TARGET_DIR/" 2>/dev/null
      if [ $? -eq 0 ]; then
        echo "  [✓] Disalin: $f"
        MATCHED=1
      fi
    fi
  done

  if [ $MATCHED -eq 1 ]; then
    ((SUCCESS++))
  else
    ((NOT_FOUND++))
  fi
done

echo "SUCCESS_COUNT: $SUCCESS"
`;

const scriptPath = path.join(testDir, 'MagicSort_Test.command');
fs.writeFileSync(scriptPath, macScript, { mode: 0o755 });

console.log('--- RUNNING UNIVERSAL FORMAT AGNOSTIC TEST ---');
const out = execSync(`bash "${scriptPath}"`, { cwd: testDir }).toString();
console.log(out);

const sorted = fs.readdirSync(path.join(testDir, 'FOTO_TERPILIH_KLIEN'));
console.log('Files copied into FOTO_TERPILIH_KLIEN:', sorted);

// Expected:
const expected = [
    'DSC0100.ARW',
    'DSC0100.xmp',
    'IMG_5500.CR3',
    'NIK_9000.NEF',
    'FUJI_123.RAF',
    'DRONE_88.DNG',
    'PHONE_99.HEIC'
];

for (const exp of expected) {
    if (!sorted.includes(exp)) {
        console.error(`❌ FAILED: ${exp} is missing!`);
        process.exit(1);
    }
}

if (sorted.includes('UNSELECTED_01.ARW')) {
    console.error('❌ FAILED: Unselected file was copied!');
    process.exit(1);
}

console.log('✅ 100% SUCCESS! Universal basename wildcard matching successfully matched ALL RAW formats + XMP sidecars regardless of extension!');

fs.rmSync(testDir, { recursive: true, force: true });
