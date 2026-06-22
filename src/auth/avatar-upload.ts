import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';

const avatarsDir = join(process.cwd(), 'uploads', 'avatars');

type UploadRequest = Request & { user?: { id: string } };

export const avatarMulterOptions = {
  storage: diskStorage({
    destination: (
      _req: UploadRequest,
      _file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void,
    ) => {
      if (!existsSync(avatarsDir)) mkdirSync(avatarsDir, { recursive: true });
      cb(null, avatarsDir);
    },
    filename: (
      req: UploadRequest,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => {
      const userId = req.user?.id || 'unknown';
      cb(null, `${userId}-${Date.now()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  fileFilter: (
    _req: UploadRequest,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) {
      return cb(new BadRequestException('Apenas imagens JPG, PNG ou WebP são permitidas'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 },
};
