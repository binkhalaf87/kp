import type { ImportedFile } from "@/lib/types";

/** A file is a duplicate if its content hash matches an already-imported file. */
export function isDuplicateHash(hash: string, existing: ImportedFile[]): boolean {
  return existing.some((f) => f.fileHash === hash);
}
