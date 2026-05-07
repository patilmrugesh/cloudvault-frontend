import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import type { FileMetadata } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File as FileIcon, Download, Loader2, AlertCircle, CheckCircle2, Share2, Key, Copy, X, Clock, Eye, EyeOff, Trash2, Pause, Play } from 'lucide-react';

export const Dashboard = () => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'paused' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null);
  const uploadStatusRef = useRef(uploadStatus);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Sharing State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFileId, setShareFileId] = useState<number | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shareTtlMinutes, setShareTtlMinutes] = useState(10);
  const [shareLink, setShareLink] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    uploadStatusRef.current = uploadStatus;
  }, [uploadStatus]);

  const fetchFiles = async () => {
    try {
      const res = await api.get('/files/list');
      console.log("FILES RESPONSE:", res.data);

      if (Array.isArray(res.data)) {
        setFiles(res.data);
      } else {
        console.error("Expected array but got:", res.data);
        setFiles([]);
        setMessage({ type: 'error', text: 'Invalid files response from server' });
      }
    } catch (err: any) {
      console.error(err);
      setFiles([]);
      setMessage({ type: 'error', text: err.response?.data || 'Failed to fetch files' });
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const startOrResumeUpload = async (sessionId?: string) => {
    if (!selectedFile) return;
    setUploadStatus('uploading');
    setMessage(null);

    let currentSessionId = sessionId || uploadSessionId;
    let missingChunks: number[] = [];
    let tChunks = 0;
    let uploadedCount = 0;

    try {
      if (!currentSessionId) {
        // Init new upload
        const initRes = await api.post('/files/upload/init', {
          filename: selectedFile.name,
          contentType: selectedFile.type || 'application/octet-stream',
          totalSize: selectedFile.size,
        });
        currentSessionId = initRes.data.sessionId;
        tChunks = initRes.data.totalChunks;
        setUploadSessionId(currentSessionId);
        missingChunks = Array.from({ length: tChunks }, (_, i) => i);
      } else {
        // Resume existing
        const statusRes = await api.get(`/files/upload/${currentSessionId}/status`);
        tChunks = statusRes.data.totalChunks;
        const uploaded = statusRes.data.uploadedChunks as number[];
        missingChunks = Array.from({ length: tChunks }, (_, i) => i).filter(i => !uploaded.includes(i));
        uploadedCount = uploaded.length;
        setUploadProgress(Math.round((uploadedCount / tChunks) * 100));
      }

      // Upload missing chunks sequentially
      for (const i of missingChunks) {
        if (uploadStatusRef.current === 'paused') {
          return; // Stop processing and keep session ID
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
        const chunk = selectedFile.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);

        let success = false;
        let retries = 0;
        const backoff = [1000, 2000, 4000];

        while (!success && retries <= 3) {
          try {
            await api.put(`/files/upload/chunk?sessionId=${currentSessionId}&chunkIndex=${i}`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            success = true;
          } catch (err) {
            if (retries === 3) throw err; // Max retries reached
            await delay(backoff[retries]);
            retries++;
          }
        }

        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / tChunks) * 100));
      }

      // Finalize
      if (uploadStatusRef.current === 'uploading') {
        await api.post(`/files/upload/${currentSessionId}/commit`);
        setUploadStatus('idle');
        setUploadSessionId(null);
        setUploadProgress(100);
        setMessage({ type: 'success', text: 'File uploaded successfully' });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchFiles();
      }

    } catch (err: any) {
      setUploadStatus('error');
      setMessage({ type: 'error', text: err.response?.data || 'Upload failed. Network error.' });
    }
  };

  const handlePause = () => setUploadStatus('paused');
  const handleResume = () => {
    if (uploadSessionId) startOrResumeUpload(uploadSessionId);
  };

  const handleDownload = async (id: number, fileName: string) => {
    try {
      const response = await api.get(`/files/download/${id}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMessage({ type: 'error', text: 'Download failed' });
    }
  };

  const handleShare = async () => {
    if (!shareFileId) return;
    setSharing(true);
    try {
      const res = await api.post('/share/create', { 
        fileId: shareFileId,
        ttlMinutes: shareTtlMinutes,
        password: sharePassword || undefined
      });
      setShareLink(res.data.shareUrl);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data || 'Failed to generate share link' });
    } finally {
      setSharing(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!shareLink) return;
    try {
      const token = shareLink.split('/').pop();
      if (!token) throw new Error("Invalid token");
      await api.delete(`/share/${token}`);
      setMessage({ type: 'success', text: 'Share link revoked successfully.' });
      setShareLink('');
      setShareModalOpen(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data || 'Failed to revoke link' });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setMessage({ type: 'success', text: 'Link copied to clipboard!' });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * FIX: Java's LocalDateTime serialises as "2024-03-15T10:30:00" (no trailing Z),
   * which browsers interpret as LOCAL time instead of UTC and can give wrong dates.
   * Appending "Z" treats it correctly as UTC.
   * Better long-term fix: use Instant or OffsetDateTime on the Java side.
   */
  const formatDate = (raw: string | null | undefined): string => {
    if (!raw) return '—';
    try {
      // Add Z if no timezone offset is present
      const iso = raw.endsWith('Z') || raw.includes('+') ? raw : raw + 'Z';
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return raw;
    }
  };

  const totalUsedBytes = files.reduce((acc, f) => acc + f.fileSize, 0);
  const totalSavedBytes = files.reduce((acc, f) => acc + (f.savedBytes || 0), 0);
  const totalStorage = totalUsedBytes + totalSavedBytes;
  const savingsPercentage = totalStorage > 0 ? Math.round((totalSavedBytes / totalStorage) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <section className="glass-card p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-700" />

        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <UploadCloud className="text-indigo-400" /> Secure Upload
        </h3>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div
            className={`flex-1 w-full border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              selectedFile
                ? 'border-indigo-500/50 bg-indigo-500/5'
                : 'border-[rgba(255,255,255,0.2)] hover:border-indigo-400/50 hover:bg-[rgba(255,255,255,0.02)]'
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

            <AnimatePresence mode="wait">
              {selectedFile ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <FileIcon size={32} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{selectedFile.name}</p>
                    <p className="text-sm text-gray-400 mt-1">{formatSize(selectedFile.size)}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-3 cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud size={32} className="text-gray-400 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Click to browse or drag file here</p>
                    <p className="text-sm text-gray-400 mt-1">AES-256 Encrypted • Distributed Storage</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full md:w-64 flex flex-col gap-4">
            {uploadStatus === 'idle' || uploadStatus === 'error' ? (
              <button
                onClick={() => startOrResumeUpload()}
                disabled={!selectedFile}
                className="btn-primary w-full flex items-center justify-center gap-2 h-14 text-lg"
              >
                <UploadCloud /> Upload to Vault
              </button>
            ) : (
              <div className="flex gap-2">
                {uploadStatus === 'paused' ? (
                  <button
                    onClick={handleResume}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 h-14 text-lg bg-emerald-500 hover:bg-emerald-600 border-emerald-500/50"
                  >
                    <Play fill="currentColor" size={20} /> Resume
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 h-14 text-lg bg-amber-500 hover:bg-amber-600 border-amber-500/50"
                  >
                    <Pause fill="currentColor" size={20} /> Pause
                  </button>
                )}
              </div>
            )}

            {(uploadStatus === 'uploading' || uploadStatus === 'paused' || uploadProgress > 0) && (
              <div 
                className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2 mt-2 overflow-hidden"
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
              >
                <motion.div
                  className={`h-2 rounded-full ${uploadStatus === 'paused' ? 'bg-amber-500' : uploadStatus === 'error' ? 'bg-red-500' : 'bg-indigo-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            )}
          </div>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 /> : <AlertCircle />}
            {message.text}
          </motion.div>
        )}
      </section>

      {/* Deduplication Storage Stats */}
      <section className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400" size={20} /> Storage Optimization
          </h3>
          <p className="text-sm text-gray-400 mt-1">Smart deduplication saves space by storing identical chunks only once.</p>
        </div>
        
        <div className="flex-1 w-full max-w-md">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-300">Used: {formatSize(totalUsedBytes)}</span>
            <span className="text-emerald-400 font-medium">Saved: {formatSize(totalSavedBytes)}</span>
          </div>
          <div className="w-full bg-[rgba(255,255,255,0.05)] rounded-full h-3 overflow-hidden flex border border-[rgba(255,255,255,0.1)]">
            <motion.div 
              className="bg-indigo-500 h-full"
              initial={{ width: 0 }}
              animate={{ width: `${totalStorage > 0 ? (totalUsedBytes / totalStorage) * 100 : 0}%` }}
              transition={{ duration: 1 }}
            />
            <motion.div 
              className="bg-emerald-500 h-full"
              initial={{ width: 0 }}
              animate={{ width: `${savingsPercentage}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <p className="text-xs text-right mt-2 text-gray-500">
            You saved <span className="text-emerald-400 font-medium">{savingsPercentage}%</span> of storage
          </p>
        </div>
      </section>

      {/* Files List Section */}
      <section className="glass-card p-8">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <FileIcon className="text-purple-400" /> Your Vault
        </h3>

        {files.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(255,255,255,0.03)] flex items-center justify-center mb-4">
              <FileIcon size={32} className="text-gray-500" />
            </div>
            <p className="text-gray-400">No files found in your vault.</p>
            <p className="text-sm text-gray-500 mt-2">Upload a file to see it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)] text-gray-400 text-sm">
                  <th className="pb-4 font-medium pl-4">File Name</th>
                  <th className="pb-4 font-medium">Size</th>
                  <th className="pb-4 font-medium">Date Uploaded</th>
                  <th className="pb-4 font-medium text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, idx) => (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={file.id}
                    className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  >
                    <td className="py-4 pl-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <FileIcon size={20} className="text-indigo-400" />
                      </div>
                      <span className="font-medium text-white">{file.fileName}</span>
                    </td>
                    <td className="py-4 text-gray-400">{formatSize(file.fileSize)}</td>
                    <td className="py-4 text-gray-400">
                      {/* FIX: Use formatDate() instead of raw new Date() to handle LocalDateTime strings */}
                      {formatDate(file.uploadDate)}
                    </td>
                    <td className="py-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setShareFileId(file.id);
                            setSharePassword('');
                            setShareLink('');
                            setShareModalOpen(true);
                          }}
                          className="p-2 bg-[rgba(255,255,255,0.05)] hover:bg-emerald-500/20 hover:text-emerald-400 rounded-lg transition-colors inline-flex text-gray-400"
                          title="Share File"
                        >
                          <Share2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDownload(file.id, file.fileName)}
                          className="p-2 bg-[rgba(255,255,255,0.05)] hover:bg-indigo-500/20 hover:text-indigo-400 rounded-lg transition-colors inline-flex text-gray-400"
                          title="Download and Decrypt"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Share Modal */}
      <AnimatePresence>
        {shareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-modal-title"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-md p-6 relative overflow-hidden"
            >
              <button 
                onClick={() => setShareModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                aria-label="Close share modal"
              >
                <X size={20} />
              </button>

              <h3 id="share-modal-title" className="text-xl font-bold mb-2 flex items-center gap-2">
                <Share2 className="text-emerald-400" /> Share File
              </h3>
              <p className="text-sm text-gray-400 mb-6">Generate a secure, expiring link for public download.</p>

              {!shareLink ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="share-ttl" className="text-sm font-medium text-gray-300 ml-1">Link Expiration</label>
                    <div className="relative mt-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock size={16} className="text-gray-500" />
                      </div>
                      <select
                        id="share-ttl"
                        value={shareTtlMinutes}
                        onChange={(e) => setShareTtlMinutes(Number(e.target.value))}
                        className="glass-input w-full pl-10 py-2 text-sm appearance-none bg-[#1a1d2d]"
                      >
                        <option value={10}>10 Minutes</option>
                        <option value={60}>1 Hour</option>
                        <option value={1440}>24 Hours</option>
                        <option value={10080}>7 Days</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="share-password" className="text-sm font-medium text-gray-300 ml-1">Optional Password</label>
                    <div className="relative mt-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key size={16} className="text-gray-500" />
                      </div>
                      <input
                        id="share-password"
                        type={showPassword ? 'text' : 'password'}
                        value={sharePassword}
                        onChange={(e) => setSharePassword(e.target.value)}
                        className="glass-input w-full pl-10 pr-10 py-2 text-sm"
                        placeholder="Leave blank for public link"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
                  >
                    {sharing ? <Loader2 size={18} className="animate-spin" /> : 'Generate Secure Link'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-gray-300 break-all select-all">
                    {shareLink}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy size={18} /> Copy Link
                    </button>
                    <button
                      onClick={handleRevokeShare}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} /> Revoke
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};