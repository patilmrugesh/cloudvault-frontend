import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import type { FileMetadata } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File as FileIcon, Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Dashboard = () => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Simulate progress for UI (real progress requires onUploadProgress)
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearInterval(interval);
      setUploadProgress(100);

      setMessage({ type: 'success', text: response.data });

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await fetchFiles();

    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data || 'Upload failed' });
    } finally {
      setTimeout(() => setUploading(false), 500);
    }
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
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
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
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="btn-primary w-full flex items-center justify-center gap-2 h-14 text-lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <UploadCloud /> Upload to Vault
                </>
              )}
            </button>

            {uploading && (
              <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2 mt-2 overflow-hidden">
                <motion.div
                  className="bg-indigo-500 h-2 rounded-full"
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
                      <button
                        onClick={() => handleDownload(file.id, file.fileName)}
                        className="p-2 bg-[rgba(255,255,255,0.05)] hover:bg-indigo-500/20 hover:text-indigo-400 rounded-lg transition-colors inline-flex text-gray-400"
                        title="Download and Decrypt"
                      >
                        <Download size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};