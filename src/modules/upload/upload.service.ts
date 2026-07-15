import { Injectable } from '@nestjs/common';
import { join } from 'path';

@Injectable()
export class UploadService {
  private readonly uploadsDir = join(__dirname, '..', '..', 'uploads', 'disputes');

  getUploadPath(filename: string): string {
    return join(this.uploadsDir, filename);
  }

  getFileUrl(filename: string): string {
    return `/uploads/disputes/${filename}`;
  }
}
