import React from 'react';
import {
  FileText,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  FileSpreadsheet,
  File as GenericFile,
} from 'lucide-react';
import { getFileExtension } from '../utils/formatters';

interface FileIconProps {
  fileName: string;
  size?: number;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ fileName, size = 18, className = '' }) => {
  const ext = getFileExtension(fileName);

  if (ext === 'pdf') {
    return (
      <div className={`p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0 ${className}`}>
        <FileText size={size} aria-hidden="true" />
      </div>
    );
  }

  if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'html', 'css', 'sql', 'sh', 'yaml', 'yml'].includes(ext)) {
    return (
      <div className={`p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0 ${className}`}>
        <FileCode size={size} aria-hidden="true" />
      </div>
    );
  }

  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
    return (
      <div className={`p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 ${className}`}>
        <FileImage size={size} aria-hidden="true" />
      </div>
    );
  }

  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
    return (
      <div className={`p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0 ${className}`}>
        <FileAudio size={size} aria-hidden="true" />
      </div>
    );
  }

  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
    return (
      <div className={`p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0 ${className}`}>
        <FileVideo size={size} aria-hidden="true" />
      </div>
    );
  }

  if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2'].includes(ext)) {
    return (
      <div className={`p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 ${className}`}>
        <FileArchive size={size} aria-hidden="true" />
      </div>
    );
  }

  if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext)) {
    return (
      <div className={`p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 ${className}`}>
        <FileSpreadsheet size={size} aria-hidden="true" />
      </div>
    );
  }

  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) {
    return (
      <div className={`p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 ${className}`}>
        <FileText size={size} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={`p-2 rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20 shrink-0 ${className}`}>
      <GenericFile size={size} aria-hidden="true" />
    </div>
  );
};
