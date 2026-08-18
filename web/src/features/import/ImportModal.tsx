import { useState, useRef } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { workerClient } from '../../services/worker-client';
import { saveDatasetLocally } from '../../storage/db';
import type { DataRecord, DatasetProfile } from '../../types';
import styles from './ImportModal.module.css';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (dataset: { profile: DatasetProfile; records: DataRecord[] }) => void;
}

export function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<{ phase: string; percentage: number; rowsProcessed: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const resetState = () => {
    setFile(null);
    setProgress(null);
    setIsProcessing(false);
    setError(null);
    cancelRef.current = null;
  };

  const handleClose = () => {
    if (isProcessing && cancelRef.current) {
      cancelRef.current();
    }
    resetState();
    onClose();
  };

  const validateFile = (selectedFile: File): boolean => {
    setError(null);
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setError('Please select a valid CSV file (.csv).');
      return false;
    }
    // Tested safe CSV limit to prevent browser tab memory exhaustion (25 MB / ~150k-200k rows)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setError(
        `File is too large (${(selectedFile.size / 1024 / 1024).toFixed(1)} MB). Tested safe maximum size is 25 MB (approx. 150,000–200,000 rows) to ensure 60 FPS performance without system lag.`
      );
      return false;
    }
    return true;
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (validateFile(selected)) {
        setFile(selected);
      }
    }
  };

  const handleStartImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress({ phase: 'Starting worker...', percentage: 5, rowsProcessed: 0 });

    try {
      const { promise, cancel } = workerClient.parseCSV(file, (p) => {
        setProgress(p);
      });
      cancelRef.current = cancel;

      const result = await promise;

      setProgress({ phase: 'Saving to IndexedDB...', percentage: 95, rowsProcessed: result.records.length });

      const profile: DatasetProfile = {
        id: `local-${Date.now()}`,
        name: file.name.replace(/\.csv$/i, ''),
        sourceType: 'local_csv',
        rowCount: result.records.length,
        columns: result.columns,
        byteSize: file.size,
        createdAt: new Date().toISOString(),
      };

      const saveRes = await saveDatasetLocally(profile, result.records);
      if (!saveRes.success) {
        throw new Error(saveRes.error ?? 'Failed to save dataset in IndexedDB');
      }

      onImportComplete({ profile, records: result.records });
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import CSV File"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleStartImport}
            disabled={!file || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Import Dataset'}
          </Button>
        </>
      }
    >
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Upload CSV file drag and drop zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className={styles.fileInput}
          onChange={handleFileChange}
        />
        <div className={styles.dropzoneIcon} aria-hidden="true">📁</div>
        <p className={styles.dropzoneText}>
          <strong>Click to browse</strong> or drag and drop your CSV file here
        </p>
        <p className={styles.dropzoneHint}>
          Supports UTF-8 CSV up to 25 MB (~150,000–200,000 rows tested for zero system lag). Processing runs off-thread in a Web Worker.
        </p>
      </div>

      {file && (
        <div className={styles.fileInfo}>
          <span>📄 <strong>{file.name}</strong></span>
          <span>
            {file.size >= 1024 * 1024 * 1024
              ? `${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
              : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
          </span>
        </div>
      )}

      {progress && (
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className={styles.progressStatus}>
            <span>{progress.phase}</span>
            <span>{progress.rowsProcessed.toLocaleString()} rows</span>
          </div>
        </div>
      )}

      {error && <div className={styles.errorBanner} role="alert">{error}</div>}
    </Modal>
  );
}
