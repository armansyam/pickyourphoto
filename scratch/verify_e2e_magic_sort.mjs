import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const testDir = path.resolve('./scratch/test_sandbox');
if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
}
fs.mkdirSync(testDir, { recursive: true });

// Create mock RAW & JPG files
const dummyFiles = [
    'DSC_0012.ARW',
    'DSC_0012.JPG',
    'DSC_0045.CR3',
    'DSC_0099.NEF',
    'DSC_9999_UNSELECTED.ARW',
    'IMG_1234 SPACES IN NAME.CR2',
];

for (const f of dummyFiles) {
    fs.writeFileSync(path.join(testDir, f), 'dummy raw data ' + f);
}

// Selected files by client:
const clientSelected = [
    'DSC_0012.jpg',
    'DSC_0045.jpg',
    'IMG_1234 SPACES IN NAME.jpg'
];

console.log('1. Mock RAW files created in sandbox:', dummyFiles);
console.log('2. Client selected:', clientSelected);

// Generate Mac script
const isMove = false;
const filesList = clientSelected.map(f => {
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

ACTION_CMD="${isMove ? 'mv' : 'cp'}"
COUNT=0
EXTS=("ARW" "arw" "CR2" "cr2" "CR3" "cr3" "NEF" "nef" "DNG" "dng" "RAF" "raf" "JPG" "jpg" "JPEG" "jpeg" "PNG" "png" "RW2" "rw2")

for base in "\${FILES[@]}"; do
  MATCHED=0
  for ext in "\${EXTS[@]}"; do
    if [ -f "\${base}.\${ext}" ]; then
      $ACTION_CMD "\${base}.\${ext}" "$TARGET_DIR/" 2>/dev/null
      MATCHED=1
    fi
  done
  if [ $MATCHED -eq 1 ]; then
    COUNT=$((COUNT + 1))
  fi
done

echo "SORT_COMPLETE_SUCCESS: $COUNT"
`;

const scriptPath = path.join(testDir, 'MagicSort_Test.command');
fs.writeFileSync(scriptPath, macScript, { mode: 0o755 });

// Execute script
console.log('3. Executing Mac script...');
const output = execSync(`bash "${scriptPath}"`, { cwd: testDir }).toString();
console.log('Script output:\n', output);

// Check results
const targetFolder = path.join(testDir, 'FOTO_TERPILIH_KLIEN');
const copiedFiles = fs.readdirSync(targetFolder);
console.log('4. Files sorted into FOTO_TERPILIH_KLIEN:', copiedFiles);

// Validations
const expectedInTarget = ['DSC_0012.ARW', 'DSC_0012.JPG', 'DSC_0045.CR3', 'IMG_1234 SPACES IN NAME.CR2'];
let allPassed = true;

for (const exp of expectedInTarget) {
    if (!copiedFiles.includes(exp)) {
        console.error(`❌ Missing expected file: ${exp}`);
        allPassed = false;
    }
}

if (copiedFiles.includes('DSC_9999_UNSELECTED.ARW')) {
    console.error('❌ Unselected file was copied erroneously!');
    allPassed = false;
}

if (allPassed) {
    console.log('✅ ALL TESTS PASSED 100%! Magic-Sort successfully matched RAW & JPG files including spaces in names.');
}

// Cleanup sandbox
fs.rmSync(testDir, { recursive: true, force: true });
