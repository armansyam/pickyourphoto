import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useRawSorter — Client-side RAW file sorter using File System Access API
 * and Magic-Sort 1-Click Script Generator for macOS (.command) and Windows (.bat).
 * 
 * Matches selected photo names (from the API) against files in a local folder,
 * then copies or moves matching RAW files to a destination folder.
 * All operations happen 100% locally — no files leave the user's computer.
 */
export default function useRawSorter() {
    const [sourceHandle, setSourceHandle] = useState(null);
    const [destHandle, setDestHandle] = useState(null);
    const [sourceName, setSourceName] = useState('');
    const [destName, setDestName] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [logs, setLogs] = useState([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [summary, setSummary] = useState(null);
    const [isSupported, setIsSupported] = useState(true);
    const abortRef = useRef(null);

    // Check browser compatibility on client mount to avoid Next.js SSR hydration false
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsSupported(typeof window.showDirectoryPicker === 'function');
        }
    }, []);

    // Emit a log entry with timestamp
    const emitLog = useCallback((type, message, file = '') => {
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLogs(prev => [...prev, { time, type, message, file }]);
    }, []);

    // Pick source folder (where RAW files live)
    const pickSourceFolder = useCallback(async () => {
        try {
            if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
                alert('Browser Anda (Brave/Safari/Firefox) membatasi akses folder langsung dari web demi privasi.\n\nSilakan gunakan opsi Magic-Sort di bawah atau gunakan Google Chrome / Microsoft Edge.');
                return null;
            }
            const handle = await window.showDirectoryPicker({ mode: 'read' });
            setSourceHandle(handle);
            setSourceName(handle.name);
            return handle.name;
        } catch (err) {
            if (err.name === 'AbortError') return null;
            throw err;
        }
    }, []);

    // Pick destination folder (where matched files will be copied/moved to)
    const pickDestFolder = useCallback(async () => {
        try {
            if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
                alert('Browser Anda (Brave/Safari/Firefox) membatasi akses folder langsung dari web demi privasi.\n\nSilakan gunakan opsi Magic-Sort di bawah atau gunakan Google Chrome / Microsoft Edge.');
                return null;
            }
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            setDestHandle(handle);
            setDestName(handle.name);
            return handle.name;
        } catch (err) {
            if (err.name === 'AbortError') return null;
            throw err;
        }
    }, []);

    // Scan source folder recursively and build a Map<baseName.toLowerCase(), FileHandle>
    const scanFolder = useCallback(async (dirHandle) => {
        const fileMap = new Map();
        
        async function traverse(handle) {
            for await (const entry of handle.values()) {
                if (entry.kind === 'file') {
                    const name = entry.name;
                    const dotIndex = name.lastIndexOf('.');
                    const baseName = (dotIndex > 0 ? name.substring(0, dotIndex) : name).toLowerCase();
                    if (!fileMap.has(baseName)) {
                        fileMap.set(baseName, { handle: entry, fullName: name });
                    }
                } else if (entry.kind === 'directory') {
                    await traverse(entry);
                }
            }
        }

        await traverse(dirHandle);
        return fileMap;
    }, []);

    // Copy a single file from source handle to destination directory
    const copyFile = useCallback(async (sourceFileHandle, destDirHandle, destFileName) => {
        const file = await sourceFileHandle.getFile();
        const destFileHandle = await destDirHandle.getFileHandle(destFileName, { create: true });
        const writable = await destFileHandle.createWritable();
        
        const reader = file.stream().getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await writable.write(value);
            }
        } finally {
            await writable.close();
        }
    }, []);

    // Main sorter — runs the matching + copy/move loop
    const runSorter = useCallback(async (fileNames, mode = 'copy', maxFiles = Infinity) => {
        if (!sourceHandle || !destHandle) {
            emitLog('error', 'Folder sumber dan tujuan harus dipilih terlebih dahulu.');
            return;
        }

        const controller = new AbortController();
        abortRef.current = controller;

        setIsRunning(true);
        setIsDone(false);
        setLogs([]);
        setSummary(null);
        setProgress({ current: 0, total: fileNames.length });

        emitLog('info', `Memulai sortir ${fileNames.length} file...`);
        emitLog('info', `Mode: ${mode === 'copy' ? '📋 Salin (Copy)' : '✂️ Pindah (Move)'}`);
        emitLog('info', 'Memindai folder sumber...');

        let successCount = 0;
        let notFoundCount = 0;
        let errorCount = 0;
        let trialLimited = false;
        const notFoundFiles = [];
        const errorFiles = [];

        try {
            const fileMap = await scanFolder(sourceHandle);
            emitLog('info', `Ditemukan ${fileMap.size} file di folder sumber.`);

            for (let i = 0; i < fileNames.length; i++) {
                if (controller.signal.aborted) {
                    emitLog('warning', 'Proses dibatalkan oleh pengguna.');
                    break;
                }

                if (successCount >= maxFiles) {
                    trialLimited = true;
                    emitLog('trial-limit', `Batas ${maxFiles} file trial tercapai. Upgrade untuk sortir semua.`);
                    break;
                }

                const fileName = fileNames[i];
                const dotIndex = fileName.lastIndexOf('.');
                const baseName = (dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName).toLowerCase();

                const match = fileMap.get(baseName);

                if (match) {
                    try {
                        await copyFile(match.handle, destHandle, match.fullName);

                        if (mode === 'move') {
                            try {
                                await match.handle.remove();
                                emitLog('success', `${match.fullName} ✓ dipindahkan`, match.fullName);
                            } catch (removeErr) {
                                emitLog('warning', `${match.fullName} ✓ disalin (gagal hapus sumber)`, match.fullName);
                            }
                        } else {
                            emitLog('success', `${match.fullName} ✓ disalin`, match.fullName);
                        }
                        successCount++;
                    } catch (copyErr) {
                        emitLog('error', `${fileName} ✕ gagal: ${copyErr.message}`, fileName);
                        errorCount++;
                        errorFiles.push(fileName);
                    }
                } else {
                    emitLog('not-found', `${fileName} ⚠ tidak ditemukan di folder sumber`, fileName);
                    notFoundCount++;
                    notFoundFiles.push(fileName);
                }

                setProgress({ current: i + 1, total: fileNames.length });
            }

            const skippedByTrial = trialLimited ? (fileNames.length - successCount - notFoundCount - errorCount) : 0;
            
            const summaryData = {
                success: successCount,
                notFound: notFoundCount,
                errors: errorCount,
                total: fileNames.length,
                trialLimited,
                skippedByTrial,
                notFoundFiles,
                errorFiles,
                mode
            };

            setSummary(summaryData);

            if (trialLimited) {
                emitLog('info', `SELESAI — ${successCount}/${fileNames.length} berhasil (trial limit)`);
            } else {
                emitLog('info', `SELESAI — ${successCount}/${fileNames.length} berhasil${notFoundCount > 0 ? `, ${notFoundCount} tidak ditemukan` : ''}${errorCount > 0 ? `, ${errorCount} error` : ''}`);
            }

        } catch (err) {
            if (err.name !== 'AbortError') {
                emitLog('error', `Fatal error: ${err.message}`);
            }
        } finally {
            setIsRunning(false);
            setIsDone(true);
            abortRef.current = null;
        }
    }, [sourceHandle, destHandle, emitLog, scanFolder, copyFile]);

    // Abort the running process
    const abort = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
    }, []);

    // Reset all state for a fresh run
    const reset = useCallback(() => {
        setIsRunning(false);
        setIsDone(false);
        setLogs([]);
        setProgress({ current: 0, total: 0 });
        setSummary(null);
    }, []);

    // Full reset including folder handles
    const fullReset = useCallback(() => {
        reset();
        setSourceHandle(null);
        setDestHandle(null);
        setSourceName('');
        setDestName('');
    }, [reset]);

    // Download Magic-Sort Script for macOS (.command) or Windows (.bat)
    const downloadMagicScript = useCallback((fileNames, projectName = 'Galeri Foto', osType = 'mac', mode = 'copy') => {
        if (!fileNames || fileNames.length === 0) return;

        const cleanProjectName = (projectName || 'PickYourPhoto').replace(/[^a-zA-Z0-9_\-]/g, '_');
        const isMove = mode === 'move';

        if (osType === 'mac') {
            const filesList = fileNames.map(f => {
                const dot = f.lastIndexOf('.');
                const base = dot > 0 ? f.substring(0, dot) : f;
                return `  "${base}"`;
            }).join('\n');

            const content = `#!/bin/bash
# ==========================================================
# 🚀 PICK YOUR PHOTO — MAGIC RAW SORTER (macOS)
# Project: ${projectName}
# Total Target: ${fileNames.length} File (${isMove ? 'Mode: Pindah/Move' : 'Mode: Salin/Copy'})
# ==========================================================

cd "$(dirname "$0")"
TARGET_DIR="FOTO_TERPILIH_KLIEN"
mkdir -p "$TARGET_DIR"
clear

echo "=========================================================="
echo "  🚀 PICK YOUR PHOTO — MAGIC RAW SORTER (macOS)"
echo "  Project: ${projectName}"
echo "  Mode: ${isMove ? 'Pindah (Move)' : 'Salin (Copy)'}"
echo "  Target Folder: $TARGET_DIR"
echo "=========================================================="
echo "  Memproses sortir ${fileNames.length} foto terpilih (semua format)..."
echo "----------------------------------------------------------"

FILES=(
${filesList}
)

SUCCESS=0
NOT_FOUND=0

# Enable nullglob & case-insensitive matching if available
shopt -s nullglob nocaseglob 2>/dev/null

for base in "\${FILES[@]}"; do
  MATCHED=0
  for f in "$base".* ; do
    if [ -f "$f" ]; then
      EXT="\${f##*.}"
      # Skip script files and target folder
      if [[ "$EXT" =~ ^(command|bat|sh|txt)$ ]]; then
        continue
      fi
      ${isMove ? 'mv "$f" "$TARGET_DIR/" 2>/dev/null' : 'cp -n "$f" "$TARGET_DIR/" 2>/dev/null'}
      if [ $? -eq 0 ]; then
        echo "  [✓] ${isMove ? 'Dipindahkan' : 'Disalin'}: $f"
        MATCHED=1
      fi
    fi
  done

  if [ $MATCHED -eq 1 ]; then
    ((SUCCESS++))
  else
    echo "  [?] Tidak ditemukan: $base.*"
    ((NOT_FOUND++))
  fi
done

echo "----------------------------------------------------------"
echo "  ✨ SELESAI!"
echo "  Total Berhasil Disortir: $SUCCESS dari ${fileNames.length} foto"
if [ $NOT_FOUND -gt 0 ]; then
  echo "  ⚠️  Tidak Ditemukan: $NOT_FOUND foto"
fi
echo "  Folder Tujuan: $(pwd)/$TARGET_DIR"
echo "=========================================================="
echo "  Tekan sembarang tombol untuk keluar..."
read -n 1 -s
`;
            const blob = new Blob([content], { type: 'application/x-sh;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `magic_sort_${cleanProjectName}_mac.command`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            // Windows .bat
            const callsList = fileNames.map(f => {
                const dot = f.lastIndexOf('.');
                const base = dot > 0 ? f.substring(0, dot) : f;
                return `call :ProcessFile "${base}"`;
            }).join('\r\n');

            const content = `@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"
set "TARGET_DIR=FOTO_TERPILIH_KLIEN"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
cls
echo ==========================================================
echo   🚀 PICK YOUR PHOTO — MAGIC RAW SORTER (Windows)
echo   Project: ${projectName}
echo   Mode: ${isMove ? 'Pindah (Move)' : 'Salin (Copy)'}
echo   Target Folder: %TARGET_DIR%
echo ==========================================================
echo   Memproses sortir ${fileNames.length} foto terpilih (semua format)...
echo ----------------------------------------------------------

set "SUCCESS=0"
set "NOT_FOUND=0"

${callsList}

goto :Done

:ProcessFile
set "BASE=%~1"
set "MATCHED=0"
for %%F in ("%BASE%.*") do (
  if /i not "%%~xF"==".bat" if /i not "%%~xF"==".command" if /i not "%%~xF"==".txt" (
    ${isMove ? 'move /Y "%%F" "%TARGET_DIR%\\" >nul 2>&1' : 'copy "%%F" "%TARGET_DIR%\\" /Y >nul 2>&1'}
    echo   [✓] ${isMove ? 'Dipindahkan' : 'Disalin'}: %%~nxF
    set "MATCHED=1"
  )
)

if "!MATCHED!"=="1" (
  set /a SUCCESS+=1
) else (
  echo   [?] Tidak ditemukan: %BASE%.*
  set /a NOT_FOUND+=1
)
exit /b

:Done
echo ----------------------------------------------------------
echo   ✨ SELESAI!
echo   Total Berhasil Disortir: !SUCCESS! dari ${fileNames.length} foto
if !NOT_FOUND! GTR 0 (
  echo   ⚠️  Tidak Ditemukan: !NOT_FOUND! foto
)
echo   Folder Tujuan: %~dp0%TARGET_DIR%
echo ==========================================================
echo   Tekan sembarang tombol untuk keluar...
pause >nul
`;
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `magic_sort_${cleanProjectName}_windows.bat`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }, []);

    return {
        // State
        sourceHandle,
        destHandle,
        sourceName,
        destName,
        isRunning,
        isDone,
        logs,
        progress,
        summary,
        isSupported,

        // Actions
        pickSourceFolder,
        pickDestFolder,
        runSorter,
        abort,
        reset,
        fullReset,
        downloadMagicScript,
    };
}
