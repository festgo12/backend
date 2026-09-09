import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';

const UPLOADS_ROOT = join(__dirname, '..', '..', 'uploads');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
];

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function multerConfigFor(
  subdir: string,
  allowedTypes: string[] = ALLOWED_MIME_TYPES,
  maxSize = MAX_FILE_SIZE,
) {
  const destination = join(UPLOADS_ROOT, subdir);

  return {
    storage: diskStorage({
      destination,
      filename: (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void,
      ) => {
        const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: (
      _req: Express.Request,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!allowedTypes.includes(file.mimetype)) {
        cb(
          new BadRequestException(
            `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
          ),
          false,
        );
        return;
      }
      cb(null, true);
    },
    limits: {
      fileSize: maxSize,
    },
  };
}

export const multerConfig = multerConfigFor('disputes');

export const cardMulterConfig = multerConfigFor(
  'cards',
  ALLOWED_IMAGE_MIME_TYPES,
);
