/**
 * Utility formatters for CloudVault file metadata, sizes, and timestamps.
 */

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${parseFloat(value.toFixed(value >= 100 || i === 0 ? 0 : 1))} ${sizes[i]}`;
}

export function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    // Java LocalDateTime strings like "2024-03-15T10:30:00" lack a timezone suffix.
    // Appending 'Z' treats them as UTC to prevent timezone shifts across browsers.
    const iso = raw.endsWith('Z') || raw.includes('+') ? raw : `${raw}Z`;
    const date = new Date(iso);
    if (isNaN(date.getTime())) return raw;

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return raw;
  }
}

export function formatDateShort(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    const iso = raw.endsWith('Z') || raw.includes('+') ? raw : `${raw}Z`;
    const date = new Date(iso);
    if (isNaN(date.getTime())) return raw;

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return raw;
  }
}

export function getFileExtension(fileName: string): string {
  if (!fileName) return '';
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0 || lastDot === fileName.length - 1) {
    return '';
  }
  return fileName.slice(lastDot + 1).toLowerCase();
}

export function truncateFileName(fileName: string, maxLen = 40): string {
  if (!fileName || fileName.length <= maxLen) return fileName;
  const ext = getFileExtension(fileName);
  const extSuffix = ext ? `.${ext}` : '';
  const nameWithoutExt = ext ? fileName.slice(0, -(ext.length + 1)) : fileName;
  const charsToShow = maxLen - extSuffix.length - 3;
  if (charsToShow <= 6) return fileName;

  const frontChars = Math.ceil(charsToShow * 0.6);
  const backChars = Math.floor(charsToShow * 0.4);

  return `${nameWithoutExt.slice(0, frontChars)}...${nameWithoutExt.slice(-backChars)}${extSuffix}`;
}
