import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useToast } from '../context/useToast';
import api from '../services/api';
import type { FileMetadata } from '../types';
import {
  Share2,
  Clock,
  Key,
  Copy,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Link as LinkIcon,
  ShieldCheck,
} from 'lucide-react';
import { truncateFileName } from '../utils/formatters';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileMetadata | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, file }) => {
  const { toast } = useToast();
  const [ttlMinutes, setTtlMinutes] = useState(60);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset state when closing/opening with new file
  const handleClose = () => {
    setShareLink('');
    setPassword('');
    setTtlMinutes(60);
    setCopied(false);
    onClose();
  };

  const handleGenerateLink = async () => {
    if (!file) return;
    setIsSubmitting(true);
    try {
      const payload: { fileId: number; ttlMinutes: number; password?: string } = {
        fileId: file.id,
        ttlMinutes,
      };
      if (password.trim()) {
        payload.password = password.trim();
      }

      const res = await api.post('/share/create', payload);
      setShareLink(res.data.shareUrl);
      toast.success('Share link generated successfully');
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: string } }).response?.data
          ? String((err as { response?: { data?: string } }).response?.data)
          : 'Failed to generate share link';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link to clipboard');
    }
  };

  const handleRevoke = async () => {
    if (!shareLink) return;
    setIsRevoking(true);
    try {
      const token = shareLink.split('/').pop();
      if (!token) throw new Error('Invalid token');
      await api.delete(`/share/${token}`);
      toast.success('Share link revoked successfully');
      setShareLink('');
      handleClose();
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: string } }).response?.data
          ? String((err as { response?: { data?: string } }).response?.data)
          : 'Failed to revoke link';
      toast.error(errorMsg);
    } finally {
      setIsRevoking(false);
    }
  };

  if (!file) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting || isRevoking ? () => {} : handleClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="truncate">Share &ldquo;{truncateFileName(file.fileName, 28)}&rdquo;</span>
        </div>
      }
      description="Create a secure, time-limited download link. Anyone with the link (and optional password) can download this file."
      maxWidth="md"
    >
      {!shareLink ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="share-ttl-select" className="text-xs font-medium text-slate-300 block mb-1.5">
              Link Expiration
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="share-ttl-select"
                value={ttlMinutes}
                onChange={(e) => setTtlMinutes(Number(e.target.value))}
                className="w-full rounded-lg bg-[#141824] text-slate-100 text-sm py-2 pl-9 pr-8 border border-white/10 hover:border-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value={10}>10 minutes</option>
                <option value={60}>1 hour (Recommended)</option>
                <option value={1440}>24 hours</option>
                <option value={10080}>7 days</option>
              </select>
            </div>
          </div>

          <div>
            <Input
              label="Password Protection (Optional)"
              id="share-password-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for open link"
              helperText="If set, recipients must enter this password to download."
              leftIcon={<Key className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
          </div>

          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 flex items-start gap-2.5 text-xs text-blue-300/90 leading-relaxed mt-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>Files are encrypted at rest. Share links point directly to secure time-bounded tokens.</span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerateLink}
              isLoading={isSubmitting}
              leftIcon={<LinkIcon className="w-4 h-4" />}
            >
              Generate Link
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <span className="text-xs font-medium text-slate-300 block mb-1.5">
              Shareable Download Link
            </span>
            <div className="p-3 rounded-lg bg-[#0E1119] border border-white/10 text-xs text-slate-200 font-mono break-all select-all leading-relaxed">
              {shareLink}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleCopy}
              leftIcon={copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copied to Clipboard' : 'Copy Link'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              isLoading={isRevoking}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Revoke Link
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
