"use client";

import { useState, useCallback } from "react";
import { Upload, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocumentUploaderProps {
  loanFileId: string;
  documentType?: string;
  onUploadComplete?: (documentId: string) => void;
  accept?: string;
}

export function DocumentUploader({
  loanFileId,
  documentType,
  onUploadComplete,
  accept = ".pdf,.jpg,.jpeg,.png",
}: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("loanFileId", loanFileId);
      if (documentType) formData.append("documentType", documentType);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      onUploadComplete?.(json.data.id);
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragging ? "border-blue-400 bg-blue-50" : "border-border hover:border-blue-300 hover:bg-slate-50"
        )}
        onClick={() => document.getElementById("file-upload-input")?.click()}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Drop file here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 50MB</p>
        <input
          id="file-upload-input"
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
          <div className="flex items-center gap-2">
            <File className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground">
              ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSelectedFile(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {selectedFile && (
        <Button onClick={handleUpload} disabled={isUploading} className="w-full">
          {isUploading ? "Uploading..." : "Upload Document"}
        </Button>
      )}
    </div>
  );
}
