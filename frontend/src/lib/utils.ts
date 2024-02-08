import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertFileToUint8Array(file: File, callback: (arrayBuffer: Uint8Array) => void): void {
  const reader = new FileReader();

  reader.onload = (e: ProgressEvent<FileReader>) => {
    if (e.target?.result instanceof ArrayBuffer) {
      const uint8Array = new Uint8Array(e.target.result);
      callback(uint8Array); // Call the callback for each individual Uint8Array
    } else {
      throw new Error('Reading file did not result in ArrayBuffer.');
    }
  };

  reader.onerror = (e) => {
    console.error(`FileReader error for file ${file.name}: ${e.target?.error}`);
  };

  reader.readAsArrayBuffer(file);
}

export function asyncConvertFileToUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result instanceof ArrayBuffer) {
        const uint8Array = new Uint8Array(e.target.result);
        resolve(uint8Array); // Resolve the promise with the Uint8Array
      } else {
        reject(new Error('Reading file did not result in ArrayBuffer.'));
      }
    };

    reader.onerror = (e) => {
      reject(new Error(`FileReader error for file ${file.name}: ${e.target?.error?.toString()}`));
    };

    reader.readAsArrayBuffer(file);
  });
}



export function asyncConvertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (typeof e.target?.result === 'string') {
        resolve(e.target.result);
      } else {
        reject(new Error('FileReader did not return a string.'));
      }
    };

    reader.onerror = (e) => {
      reject(new Error(`FileReader error for file ${file.name}: ${e.target?.error?.message}`));
    };

    reader.readAsDataURL(file);
  });
}


export const fetcher = (...args: Parameters<typeof fetch>) => fetch(...args).then(res => res.json())



function createURLHasher() {
  let urlMap = new Map<string, number>();
  let counter = 0;

  return function hash(url: string): number {
    if (!urlMap.has(url)) {
      urlMap.set(url, counter);
      counter++;
    }
    return urlMap.get(url)!;
  };
}

export const hashEndpoints = createURLHasher();
