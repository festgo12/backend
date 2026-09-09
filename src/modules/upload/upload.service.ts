import { Injectable } from '@nestjs/common';
import { join } from 'path';

@Injectable()
export class UploadService {
  private readonly uploadsDir = join(__dirname, '..', '..', 'uploads');

  getUploadPath(filename: string, subdir = 'disputes'): string {
    return join(this.uploadsDir, subdir, filename);
  }

  getFileUrl(filename: string, subdir = 'disputes'): string {
    const publicBase = (
      process.env.PUBLIC_API_URL || 'http://localhost:3000'
    ).replace(/\/$/, '');
    return `${publicBase}/uploads/${subdir}/${filename}`;
  }
}
