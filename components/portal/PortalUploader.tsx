"use client";

import { useState, useCallback } from "react";
import { Upload, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalUploaderProps {
  loanToken: string;
  documentType: string;
  documentLabel: string;
  onUploaded?: () => void;
}

export function PortalUploader({ loanToken, documentType, documentLabel, onUploaded }: PortalUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      formData.append("token", loanToken);

      const res = await fetch(`/api/portal/${loanToken}`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      setUploaded(true);
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [loanToken, documentType, onUploaded]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (uploaded) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-green-200 bg-green-50">
        <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
        <p className="font-semibold text-green-700">Uploaded Successfully!</p>
        <p className="text-sm text-green-600">Your {documentLabel} has been received.</p>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById(`portal-upload-${documentType}`)?.click()}
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
        isDragging ? "border-blue-400 bg-blue-50" : "border-blue-200 hover:border-blue-400 hover:bg-blue-50"
      )}
    >
      <Upload className="h-8 w-8 text-blue-400 mb-3" />
      <p className="font-semibold text-center">{isUploading ? "Uploading..." : `Upload ${documentLabel}`}</p>
      <p className="text-sm text-muted-foreground text-center mt-1">
        Tap to take a photo or choose a file
      </p>
      <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG accepted</p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <input
        id={`portal-upload-${documentType}`}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
