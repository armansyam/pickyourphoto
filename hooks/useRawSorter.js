"use client";

import { useState, useCallback, useRef } from 'react';

/**
 * useRawSorter — Client-side RAW file sorter using File System Access API
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
    const abortRef = useRef(null);

    // Emit a log entry with timestamp
    const emitLog = useCallback((type, message, file = '') => {
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLogs(prev => [...prev, { time, type, message, file }]);
    }, []);

    // Pick source folder (where RAW files live)
    const pickSourceFolder = useCallback(async () => {
        try {
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
                    // If multiple files share the same base name, keep all of them 
                    // (e.g. DSC_0201.ARW and DSC_0201.CR2)
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
        
        // Stream the file for memory efficiency with large RAW files
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

        // Create abort controller
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
            // Step 1: Scan source folder
            const fileMap = await scanFolder(sourceHandle);
            emitLog('info', `Ditemukan ${fileMap.size} file di folder sumber.`);

            // Step 2: Loop through selected file names
            for (let i = 0; i < fileNames.length; i++) {
                // Check abort
                if (controller.signal.aborted) {
                    emitLog('warning', 'Proses dibatalkan oleh pengguna.');
                    break;
                }

                // Check trial limit
                if (successCount >= maxFiles) {
                    trialLimited = true;
                    emitLog('trial-limit', `Batas ${maxFiles} file trial tercapai. Upgrade untuk sortir semua.`);
                    break;
                }

                const fileName = fileNames[i];
                const dotIndex = fileName.lastIndexOf('.');
                const baseName = (dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName).toLowerCase();

                // Lookup in file map (case-insensitive by base name)
                const match = fileMap.get(baseName);

                if (match) {
                    try {
                        // Copy file to destination
                        await copyFile(match.handle, destHandle, match.fullName);

                        // If mode is 'move', remove source after successful copy
                        if (mode === 'move') {
                            try {
                                await match.handle.remove();
                                emitLog('success', `${match.fullName} ✓ dipindahkan`, match.fullName);
                            } catch (removeErr) {
                                // Copy succeeded but remove failed — not critical
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

            // Step 3: Summary
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
        // Keep folder handles so user doesn't have to re-pick
    }, []);

    // Full reset including folder handles
    const fullReset = useCallback(() => {
        reset();
        setSourceHandle(null);
        setDestHandle(null);
        setSourceName('');
        setDestName('');
    }, [reset]);

    // Check if browser supports File System Access API
    const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

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
    };
}
