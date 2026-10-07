import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import type { FileMetadata } from '../types';
import { useToast } from '../context/useToast';
import {
  UploadCloud,
  Download,
  Share2,
  Trash2,
  Sparkles,
  Search,
  ArrowUpDown,
  Pause,
  Play,
  Database,
  CheckCircle2,
  X,
  FileCheck2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Checkbox } from '../components/ui/Checkbox';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { FileIcon } from '../components/FileIcon';
import { ShareModal } from '../components/ShareModal';
import { DocumentAiModal } from '../components/DocumentAiModal';
import {
  formatBytes,
  formatDate,
  truncateFileName,
} from '../utils/formatters';

type SortField = 'name' | 'size' | 'date';
type SortOrder = 'asc' | 'desc';

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const Dashboard: React.FC = () => {
  const { toast } = useToast();

  // Core Data
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // File Upload State
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'paused' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const uploadStatusRef = useRef(uploadStatus);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection & Bulk State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modal States
  const [shareTargetFile, setShareTargetFile] = useState<FileMetadata | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [aiTargetFile, setAiTargetFile] = useState<FileMetadata | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Single Delete State
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<FileMetadata | null>(null);
  const [isSingleDeleteLoading, setIsSingleDeleteLoading] = useState(false);

  // Bulk Delete State
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleteLoading, setIsBulkDeleteLoading] = useState(false);

  useEffect(() => {
    uploadStatusRef.current = uploadStatus;
  }, [uploadStatus]);

  // Refresh files after actions (upload/delete)
  const refreshFiles = useCallback(async () => {
    try {
      const res = await api.get('/files/list');
      if (Array.isArray(res.data)) {
        setFiles(res.data);
      } else {
        setFiles([]);
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: unknown } };
      const msg = typeof errObj.response?.data === 'string'
        ? errObj.response.data
        : 'Failed to refresh files';
      toast.error(msg);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    let ignore = false;
    api.get('/files/list')
      .then((res) => {
        if (!ignore) {
          if (Array.isArray(res.data)) {
            setFiles(res.data);
          } else {
            setFiles([]);
          }
        }
      })
      .catch(() => {
        if (!ignore) setFiles([]);
      })
      .finally(() => {
        if (!ignore) setIsLoadingFiles(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Storage metrics (calculated strictly from real files)
  const totalUsedBytes = useMemo(
    () => files.reduce((acc, f) => acc + (f.fileSize || 0), 0),
    [files]
  );
  const totalSavedBytes = useMemo(
    () => files.reduce((acc, f) => acc + (f.savedBytes || 0), 0),
    [files]
  );
  const totalVirtualStorage = totalUsedBytes + totalSavedBytes;
  const savingsPercentage = totalVirtualStorage > 0
    ? Math.round((totalSavedBytes / totalVirtualStorage) * 100)
    : 0;

  // Filtered & Sorted Files
  const filteredFiles = useMemo(() => {
    let result = files;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((f) => f.fileName.toLowerCase().includes(q));
    }

    return [...result].sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.fileName.localeCompare(b.fileName);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'size') {
        const diff = a.fileSize - b.fileSize;
        return sortOrder === 'asc' ? diff : -diff;
      }
      // date
      const dateA = new Date(a.uploadDate).getTime() || 0;
      const dateB = new Date(b.uploadDate).getTime() || 0;
      const diff = dateA - dateB;
      return sortOrder === 'asc' ? diff : -diff;
    });
  }, [files, searchQuery, sortField, sortOrder]);

  // Selection Handlers
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const isAllSelected = filteredFiles.length > 0 && selectedIds.size === filteredFiles.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < filteredFiles.length;

  // File Upload Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedUploadFile(e.target.files[0]);
      setUploadErrorMessage(null);
    }
  };

  const startOrResumeUpload = async (sessionId?: string) => {
    if (!selectedUploadFile) return;
    setUploadStatus('uploading');
    setUploadErrorMessage(null);

    let currentSessionId = sessionId || uploadSessionId;

    try {
      let missingChunks: number[] = [];
      let totalChunks = 0;
      let uploadedCount = 0;

      if (!currentSessionId) {
        // Initialize new chunked session
        const initRes = await api.post('/files/upload/init', {
          filename: selectedUploadFile.name,
          contentType: selectedUploadFile.type || 'application/octet-stream',
          totalSize: selectedUploadFile.size,
        });
        currentSessionId = initRes.data.sessionId;
        totalChunks = initRes.data.totalChunks;
        setUploadSessionId(currentSessionId);
        missingChunks = Array.from({ length: totalChunks }, (_, i) => i);
      } else {
        // Resume existing session
        const statusRes = await api.get(`/files/upload/${currentSessionId}/status`);
        totalChunks = statusRes.data.totalChunks;
        const uploaded = statusRes.data.uploadedChunks as number[];
        missingChunks = Array.from({ length: totalChunks }, (_, i) => i).filter(
          (i) => !uploaded.includes(i)
        );
        uploadedCount = uploaded.length;
        setUploadProgress(Math.round((uploadedCount / totalChunks) * 100));
      }

      // Upload chunks sequentially
      for (const i of missingChunks) {
        if (uploadStatusRef.current === 'paused') {
          return;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, selectedUploadFile.size);
        const chunk = selectedUploadFile.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);

        let success = false;
        let retries = 0;
        const backoff = [1000, 2000, 4000];

        while (!success && retries <= 3) {
          try {
            await api.put(
              `/files/upload/chunk?sessionId=${currentSessionId}&chunkIndex=${i}`,
              formData,
              { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            success = true;
          } catch (err) {
            if (retries === 3) throw err;
            await delay(backoff[retries]);
            retries++;
          }
        }

        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalChunks) * 100));
      }

      // Commit upload session
      if (uploadStatusRef.current === 'uploading') {
        await api.post(`/files/upload/${currentSessionId}/commit`);
        setUploadStatus('idle');
        setUploadSessionId(null);
        setUploadProgress(100);
        setSelectedUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.success(`Successfully uploaded "${selectedUploadFile.name}" to vault.`);
        await refreshFiles();
      }
    } catch (err: unknown) {
      setUploadStatus('error');
      const errObj = err as { response?: { data?: unknown } };
      const msg = typeof errObj.response?.data === 'string'
        ? errObj.response.data
        : 'Upload failed due to network error. You can resume at any time.';
      setUploadErrorMessage(msg);
      toast.error(msg);
    }
  };

  const handlePause = () => setUploadStatus('paused');
  const handleResume = () => {
    if (uploadSessionId) startOrResumeUpload(uploadSessionId);
  };

  // Download Handler
  const handleDownload = async (file: FileMetadata) => {
    try {
      const response = await api.get(`/files/download/${file.id}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Download started for "${truncateFileName(file.fileName, 24)}"`);
    } catch {
      toast.error('Download failed. Please check permissions and try again.');
    }
  };

  // Single File Delete Handlers
  const openSingleDeleteModal = (file: FileMetadata) => {
    setSingleDeleteTarget(file);
  };

  const confirmSingleDelete = async () => {
    if (!singleDeleteTarget) return;
    setIsSingleDeleteLoading(true);
    try {
      await api.delete(`/files/${singleDeleteTarget.id}`);
      toast.success(`"${singleDeleteTarget.fileName}" deleted permanently.`);
      // Remove from selection if present
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(singleDeleteTarget.id);
        return next;
      });
      setSingleDeleteTarget(null);
      await refreshFiles();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: unknown } };
      const msg = typeof errObj.response?.data === 'string'
        ? errObj.response.data
        : 'Failed to delete file';
      toast.error(msg);
    } finally {
      setIsSingleDeleteLoading(false);
    }
  };

  // Bulk Delete Handlers
  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleteLoading(true);

    const idsToDelete = Array.from(selectedIds);
    let successCount = 0;
    const failedIds: number[] = [];

    // Safely execute deletions in parallel chunks using existing DELETE /files/{id}
    const results = await Promise.allSettled(
      idsToDelete.map((id) => api.delete(`/files/${id}`))
    );

    results.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        successCount++;
      } else {
        failedIds.push(idsToDelete[index]);
      }
    });

    if (failedIds.length === 0) {
      toast.success(`Successfully deleted ${successCount} ${successCount === 1 ? 'file' : 'files'}.`);
      setSelectedIds(new Set());
    } else if (successCount > 0) {
      toast.warning(
        `Deleted ${successCount} files, but ${failedIds.length} failed to delete.`
      );
      setSelectedIds(new Set(failedIds));
    } else {
      toast.error('Failed to delete selected files. Please try again.');
    }

    setIsBulkDeleteLoading(false);
    setIsBulkDeleteModalOpen(false);
    await refreshFiles();
  };

  return (
    <div className="space-y-6">
      {/* Overview & Storage Deduplication */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Files Stat */}
        <div className="rounded-xl bg-[#131724] border border-white/[0.08] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Files
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white tracking-tight">
              {files.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {formatBytes(totalUsedBytes)} physical payload
            </p>
          </div>
        </div>

        {/* Deduplication Storage Optimization Card */}
        <div className="md:col-span-2 rounded-xl bg-[#131724] border border-white/[0.08] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Chunk Deduplication Engine
                </span>
                <Badge variant="success" size="sm">
                  {savingsPercentage}% space saved
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Duplicate chunks are stored once in MinIO and referenced across files
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:block">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Physical Storage: <strong className="text-white font-mono">{formatBytes(totalUsedBytes)}</strong></span>
              <span className="text-emerald-400">Deduplicated Savings: <strong className="font-mono">{formatBytes(totalSavedBytes)}</strong></span>
            </div>

            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden flex" role="progressbar" aria-label="Storage allocation">
              <div
                className="bg-blue-500 h-full transition-all duration-500"
                style={{
                  width: `${totalVirtualStorage > 0 ? (totalUsedBytes / totalVirtualStorage) * 100 : 0}%`,
                }}
              />
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${totalVirtualStorage > 0 ? (totalSavedBytes / totalVirtualStorage) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <section className="rounded-xl bg-[#131724] border border-white/[0.08] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Upload Files
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chunked & resumable upload with SHA-256 deduplication
            </p>
          </div>
          {uploadStatus !== 'idle' && (
            <Badge
              variant={
                uploadStatus === 'uploading'
                  ? 'primary'
                  : uploadStatus === 'paused'
                  ? 'warning'
                  : 'danger'
              }
            >
              {uploadStatus === 'uploading' && `Uploading (${uploadProgress}%)`}
              {uploadStatus === 'paused' && `Paused at ${uploadProgress}%`}
              {uploadStatus === 'error' && 'Upload Failed'}
            </Badge>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          {/* File Selector Dropzone */}
          <div
            className={`flex-1 rounded-xl border border-dashed p-6 text-center transition-colors flex flex-col items-center justify-center cursor-pointer ${
              selectedUploadFile
                ? 'border-blue-500/50 bg-blue-500/[0.04]'
                : 'border-white/15 hover:border-white/25 hover:bg-white/[0.02]'
            }`}
            onClick={() => uploadStatus !== 'uploading' && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadStatus === 'uploading'}
            />

            {selectedUploadFile ? (
              <div className="flex items-center gap-3 max-w-full">
                <FileIcon fileName={selectedUploadFile.name} size={20} />
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate max-w-[280px] sm:max-w-md">
                    {selectedUploadFile.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatBytes(selectedUploadFile.size)} • Click to choose different file
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                  <UploadCloud className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-200">
                    Click to select file
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Files are split into 2MB chunks and encrypted before transit
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action & Progress Area */}
          <div className="w-full lg:w-72 flex flex-col justify-between gap-3">
            {uploadStatus === 'idle' || uploadStatus === 'error' ? (
              <Button
                variant="primary"
                size="lg"
                disabled={!selectedUploadFile}
                onClick={() => startOrResumeUpload()}
                className="w-full"
                leftIcon={<UploadCloud className="w-4 h-4" />}
              >
                Upload to Vault
              </Button>
            ) : (
              <div className="flex gap-2">
                {uploadStatus === 'paused' ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleResume}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 border-amber-500/30"
                    leftIcon={<Play className="w-4 h-4" />}
                  >
                    Resume
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handlePause}
                    className="flex-1"
                    leftIcon={<Pause className="w-4 h-4" />}
                  >
                    Pause
                  </Button>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {(uploadStatus === 'uploading' || uploadStatus === 'paused' || uploadProgress > 0) && (
              <div className="p-3 rounded-lg bg-[#0F121C] border border-white/5 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Transfer Progress</span>
                  <span className="font-mono text-slate-200">{uploadProgress}%</span>
                </div>
                <div
                  className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={`h-full transition-all duration-200 ${
                      uploadStatus === 'paused'
                        ? 'bg-amber-500'
                        : uploadStatus === 'error'
                        ? 'bg-rose-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadErrorMessage && (
              <div className="text-xs text-rose-400 p-2 rounded bg-rose-500/10 border border-rose-500/20 leading-tight">
                {uploadErrorMessage}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Files Section Header & Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Vault Documents
            </h2>
            <p className="text-xs text-slate-400">
              {filteredFiles.length} of {files.length} {files.length === 1 ? 'file' : 'files'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter files by name..."
                className="w-full rounded-lg bg-[#141824] text-slate-100 placeholder:text-slate-500 text-xs py-2 pl-9 pr-8 border border-white/10 hover:border-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
                  aria-label="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <div className="relative">
              <select
                aria-label="Sort files by"
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                  setSortField(field);
                  setSortOrder(order);
                }}
                className="rounded-lg bg-[#141824] text-slate-200 text-xs py-2 px-3 border border-white/10 hover:border-white/20 focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer pr-7"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="size-desc">Largest first</option>
                <option value="size-asc">Smallest first</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Bulk Action Toolbar (Appears dynamically when files are selected) */}
        {selectedIds.size > 0 && (
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="md">
                {selectedIds.size} {selectedIds.size === 1 ? 'file' : 'files'} selected
              </Badge>
              <button
                onClick={handleClearSelection}
                className="text-slate-400 hover:text-slate-200 transition-colors underline ml-1"
              >
                Deselect all
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Files Table / Workspace */}
        <div className="rounded-xl bg-[#131724] border border-white/[0.08] overflow-hidden">
          {isLoadingFiles ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <Skeleton className="flex-1 h-5 rounded" />
                  <Skeleton className="w-20 h-5 rounded hidden sm:block" />
                  <Skeleton className="w-28 h-5 rounded hidden md:block" />
                  <Skeleton className="w-24 h-8 rounded" />
                </div>
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            files.length === 0 ? (
              <EmptyState
                icon={<UploadCloud className="w-6 h-6 text-blue-400" />}
                title="Your vault is currently empty"
                description="Upload documents, archives, or media files to securely store and run AI analysis on them."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<UploadCloud className="w-4 h-4" />}
                  >
                    Select File to Upload
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Search className="w-6 h-6 text-slate-400" />}
                title="No matching files found"
                description={`No files match your search query "${searchQuery}".`}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Filter
                  </Button>
                }
              />
            )
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#0E1119] text-slate-400 uppercase font-semibold tracking-wider">
                    <th className="py-3 px-4 w-10 text-center">
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={isPartiallySelected}
                        onChange={handleSelectAllFiltered}
                        aria-label="Select all files in view"
                      />
                    </th>
                    <th className="py-3 px-3 font-medium">Document Name</th>
                    <th className="py-3 px-3 font-medium hidden sm:table-cell w-28">Size</th>
                    <th className="py-3 px-3 font-medium hidden md:table-cell w-36">Uploaded</th>
                    <th className="py-3 px-4 font-medium text-right w-44">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedIds.has(file.id);

                    return (
                      <tr
                        key={file.id}
                        className={`transition-colors group ${
                          isSelected
                            ? 'bg-blue-600/[0.08] hover:bg-blue-600/[0.12]'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Checkbox column */}
                        <td className="py-3 px-4 text-center">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleToggleSelect(file.id)}
                            aria-label={`Select ${file.fileName}`}
                          />
                        </td>

                        {/* File Name & Icon */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileIcon fileName={file.fileName} size={18} />
                            <div className="min-w-0">
                              <span
                                className="font-medium text-slate-200 group-hover:text-white transition-colors block truncate max-w-[180px] sm:max-w-xs md:max-w-md"
                                title={file.fileName}
                              >
                                {truncateFileName(file.fileName, 44)}
                              </span>
                              <span className="text-[11px] text-slate-400 sm:hidden">
                                {formatBytes(file.fileSize)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-3 text-slate-400 font-mono hidden sm:table-cell whitespace-nowrap">
                          {formatBytes(file.fileSize)}
                        </td>

                        {/* Upload Date */}
                        <td className="py-3 px-3 text-slate-400 hidden md:table-cell whitespace-nowrap">
                          {formatDate(file.uploadDate)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              icon={<Sparkles className="w-4 h-4 text-indigo-400" />}
                              aria-label={`AI Intelligence analysis for ${file.fileName}`}
                              title="AI Intelligence (Summary, Notes, Q&A)"
                              onClick={() => {
                                setAiTargetFile(file);
                                setIsAiModalOpen(true);
                              }}
                            />

                            <IconButton
                              variant="ghost"
                              size="sm"
                              icon={<Share2 className="w-4 h-4 text-slate-300" />}
                              aria-label={`Share ${file.fileName}`}
                              title="Create secure share link"
                              onClick={() => {
                                setShareTargetFile(file);
                                setIsShareModalOpen(true);
                              }}
                            />

                            <IconButton
                              variant="ghost"
                              size="sm"
                              icon={<Download className="w-4 h-4 text-slate-300" />}
                              aria-label={`Download ${file.fileName}`}
                              title="Download & Decrypt"
                              onClick={() => handleDownload(file)}
                            />

                            <IconButton
                              variant="destructive"
                              size="sm"
                              icon={<Trash2 className="w-4 h-4 text-rose-400" />}
                              aria-label={`Delete ${file.fileName}`}
                              title="Delete file permanently"
                              onClick={() => openSingleDeleteModal(file)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        file={shareTargetFile}
      />

      {/* AI Document Modal */}
      <DocumentAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        file={aiTargetFile}
      />

      {/* Single File Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(singleDeleteTarget)}
        onClose={() => !isSingleDeleteLoading && setSingleDeleteTarget(null)}
        onConfirm={confirmSingleDelete}
        title="Delete File from Vault"
        confirmText="Delete File"
        isDestructive={true}
        isLoading={isSingleDeleteLoading}
        description={
          <div>
            <p>
              Are you sure you want to permanently delete{' '}
              <strong className="text-white font-mono break-all">
                &ldquo;{singleDeleteTarget?.fileName}&rdquo;
              </strong>
              ?
            </p>
            <p className="mt-2 text-xs text-rose-300/90">
              This will remove the file from MinIO object storage and purge its metadata. This action cannot be reversed.
            </p>
          </div>
        }
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleteModalOpen}
        onClose={() => !isBulkDeleteLoading && setIsBulkDeleteModalOpen(false)}
        onConfirm={confirmBulkDelete}
        title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'File' : 'Files'}?`}
        confirmText={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'File' : 'Files'}`}
        isDestructive={true}
        isLoading={isBulkDeleteLoading}
        description={
          <div>
            <p>
              You are about to permanently delete{' '}
              <strong className="text-white">
                {selectedIds.size} selected {selectedIds.size === 1 ? 'file' : 'files'}
              </strong>{' '}
              from your CloudVault storage.
            </p>
            <div className="mt-3 p-3 rounded-lg bg-[#0E1119] border border-white/5 max-h-32 overflow-y-auto custom-scrollbar text-xs font-mono text-slate-300 space-y-1">
              {files
                .filter((f) => selectedIds.has(f.id))
                .map((f) => (
                  <div key={f.id} className="truncate flex items-center gap-1.5">
                    <FileCheck2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{f.fileName}</span>
                  </div>
                ))}
            </div>
            <p className="mt-3 text-xs text-rose-300/90">
              All selected file payloads will be deleted immediately. This operation is irreversible.
            </p>
          </div>
        }
      />
    </div>
  );
};