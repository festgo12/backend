import { Injectable } from '@nestjs/common';
import { join } from 'path';

/** Public origin configured for the API (PUBLIC_API_URL, then APP_URL). */
function publicBaseUrl(): string {
  return (
    process.env.PUBLIC_API_URL ||
    process.env.APP_URL ||
    'http://localhost:3000'
  ).replace(/\/+$/, '');
}

@Injectable()
export class UploadService {
  private readonly uploadsDir = join(__dirname, '..', '..', 'uploads');

  getUploadPath(filename: string, subdir = 'disputes'): string {
    return join(this.uploadsDir, subdir, filename);
  }

  getFileUrl(filename: string, subdir = 'disputes'): string {
    return `${publicBaseUrl()}/uploads/${subdir}/${filename}`;
  }

  /**
   * Rewrites a stored upload URL onto the currently configured public origin.
   *
   * Older rows persisted absolute URLs generated from whatever
   * PUBLIC_API_URL/APP_URL (or the localhost default) was active at upload
   * time, so dev-machine "http://localhost:3000/..." URLs leak into
   * production responses. This helper re-anchors:
   * - relative paths ("/uploads/...") onto the configured base, and
   * - same-host-port localhost origins ("http://localhost:3000/...") onto the
   *   configured base,
   * while leaving any other absolute URL (e.g. a real CDN) untouched.
   */
  normalizeStoredFileUrl(url: string | null | undefined): string {
    if (!url) return url ?? '';
    const base = publicBaseUrl();
    if (url.startsWith('/uploads/')) return `${base}${url}`;

    // Stale absolute origin: http://localhost[:port]/uploads/<subdir>/<file>
    const staleMatch = /^https?:\/\/localhost(?::\d+)?(\/uploads\/.+)$/i.exec(
      url,
    );
    if (staleMatch) return `${base}${staleMatch[1]}`;

    return url;
  }

  /**
   * Inverse of normalizeStoredFileUrl: rewrites a stored upload URL down to
   * its relative "/uploads/..." path so every client can prefix its own
   * configured API base (admin uses NEXT_PUBLIC_API_URL, the Flutter app uses
   * EnvConfig.baseUrl). Legacy rows that persisted an absolute dev origin
   * ("http://localhost:3000/uploads/...") or the previously configured public
   * base are converted; anything else is returned untouched.
   */
  toRelativeStoredUrl(url: string | null | undefined): string {
    if (!url) return url ?? '';

    const staleMatch = /^https?:\/\/localhost(?::\d+)?(\/uploads\/.+)$/i.exec(
      url,
    );
    if (staleMatch) return staleMatch[1];

    const base = publicBaseUrl();
    if (url.startsWith(`${base}/uploads/`)) {
      return url.slice(base.length);
    }

    return url;
  }
}
