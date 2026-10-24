import { DomainError } from "../domain/domain-error";

export class StorageUnavailableError extends DomainError {
  readonly kind = "invalid_state" as const;
  readonly code = "files.storage_unavailable";
  constructor() {
    super("Não foi possível guardar a fotografia agora. Tente de novo dentro de momentos.");
  }
}

export class InvalidFileError extends DomainError {
  readonly kind = "validation" as const;
  readonly code = "files.invalid_file";
  constructor(message: string) {
    super(message, "avatar");
  }
}

export const AVATAR_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarContentType = (typeof AVATAR_CONTENT_TYPES)[number];

export interface IncomingFile {
  name: string;
  contentType: AvatarContentType;
  data: Uint8Array;
}

export interface StoredFile {
  key: string;
  url: string;
  name: string;
  size: number;
  contentType: AvatarContentType;
}

export abstract class FileStorage {
  abstract upload(file: IncomingFile, folder: string): Promise<StoredFile>;
  abstract delete(keys: string[]): Promise<void>;
}

export function detectImageType(data: Uint8Array): AvatarContentType | null {
  const starts = (...bytes: number[]) => bytes.every((byte, index) => data[index] === byte);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...data.subarray(8, 12)) === "WEBP") return "image/webp";
  return null;
}

const EXTENSION: Record<AvatarContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateAvatarUpload(file: { name: string; data: Uint8Array } | undefined, maxBytes: number): IncomingFile {
  if (!file?.data.length) throw new InvalidFileError("Escolha uma fotografia.");
  if (file.data.length > maxBytes) {
    throw new InvalidFileError(`A fotografia é demasiado grande (máximo ${Math.round(maxBytes / 1024 / 1024)} MB).`);
  }
  const contentType = detectImageType(file.data);
  if (!contentType) throw new InvalidFileError("Use uma fotografia JPG, PNG ou WebP.");
  const base =
    file.name
      .replace(/\.[^.]*$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "avatar";
  return { name: `${base}.${EXTENSION[contentType]}`, contentType, data: file.data };
}
