"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, FileWarning } from "lucide-react";
import { cn } from "@/lib/cn";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB (mirrors backend MAX_FILE_MB)

interface UploadDropzoneProps {
  onFile: (file: File) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function UploadDropzone({ onFile, onError, disabled }: UploadDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const err = rejections[0]?.errors[0];
        const reason =
          err?.code === "file-too-large"
            ? "That file is larger than 5 MB."
            : err?.code === "file-invalid-type"
              ? "Only .csv files are supported."
              : (err?.message ?? "File rejected.");
        onError?.(reason);
        return;
      }
      const file = accepted[0];
      if (file) onFile(file);
    },
    [onFile, onError]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.ms-excel": [".csv"] },
    maxSize: MAX_SIZE,
    multiple: false,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition",
        "border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500 dark:hover:bg-slate-800/60",
        isDragActive && "border-brand-500 bg-brand-50 dark:bg-slate-800",
        isDragReject && "border-red-400 bg-red-50 dark:bg-red-950/30",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input {...getInputProps()} />
      <div
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600 transition group-hover:scale-105 dark:bg-brand-900/50 dark:text-brand-300",
          isDragReject && "bg-red-100 text-red-500 dark:bg-red-900/40"
        )}
      >
        {isDragReject ? <FileWarning className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
      </div>
      <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
        {isDragActive ? "Drop your CSV here" : "Drop your CSV file here"}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        or <span className="font-medium text-brand-600 dark:text-brand-400">click to browse</span>
      </p>
      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        Any column layout works · .csv · max 5&nbsp;MB
      </p>
    </div>
  );
}
