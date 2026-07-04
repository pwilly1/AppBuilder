import { randomUUID } from 'node:crypto';
import { BlobServiceClient } from '@azure/storage-blob';
import {
  AZURE_STORAGE_CONNECTION_STRING,
  AZURE_STORAGE_CONTAINER_NAME,
  AZURE_STORAGE_PUBLIC_BASE_URL,
} from '../config/index.js';

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export class AssetStorageNotConfiguredError extends Error {
  constructor() {
    super('Image asset storage is not configured.');
  }
}

export function isSupportedImageContentType(contentType: string) {
  return Object.prototype.hasOwnProperty.call(IMAGE_EXTENSIONS, contentType.toLowerCase());
}

function imageExtension(contentType: string) {
  return IMAGE_EXTENSIONS[contentType.toLowerCase()] ?? 'bin';
}

function assetUrl(blobName: string, fallbackUrl: string) {
  if (!AZURE_STORAGE_PUBLIC_BASE_URL) return fallbackUrl;
  return `${AZURE_STORAGE_PUBLIC_BASE_URL}/${blobName}`;
}

export type UploadedAsset = {
  url: string;
  blobName: string;
  contentType: string;
  size: number;
};

export class AssetStorageService {
  async uploadProjectImage(input: {
    projectId: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<UploadedAsset> {
    if (!AZURE_STORAGE_CONNECTION_STRING) {
      throw new AssetStorageNotConfiguredError();
    }

    const contentType = input.contentType.toLowerCase();
    if (!isSupportedImageContentType(contentType)) {
      throw new Error('Unsupported image file type.');
    }

    const serviceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = serviceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
    await containerClient.createIfNotExists();

    const blobName = `projects/${input.projectId}/images/${randomUUID()}.${imageExtension(contentType)}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(input.buffer, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobCacheControl: 'public, max-age=31536000, immutable',
      },
    });

    return {
      url: assetUrl(blobName, blockBlobClient.url),
      blobName,
      contentType,
      size: input.buffer.byteLength,
    };
  }
}
