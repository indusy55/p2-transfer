/// <reference types="vite/client" />

interface Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle {
  createWritable: () => Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write: (data: BufferSource | Blob | string) => Promise<void>;
  close: () => Promise<void>;
  abort: () => Promise<void>;
}
