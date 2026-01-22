import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileImage, X, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface DicomUploadProps {
  patientId?: number;
  onUploadComplete?: (studyId: number) => void;
}

interface UploadFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export function DicomUpload({ patientId, onUploadComplete }: DicomUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.studies.uploadDicom.useMutation({
    onSuccess: (data: { studyId: number; success: boolean }) => {
      toast.success("DICOM files uploaded successfully");
      if (onUploadComplete && data.studyId) {
        onUploadComplete(data.studyId);
      }
    },
    onError: (error: { message: string }) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles).map((file) => ({
      file,
      status: "pending",
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select DICOM files to upload");
      return;
    }

    if (!patientId) {
      toast.error("Patient ID is required");
      return;
    }

    // Update all files to uploading status
    setFiles((prev) =>
      prev.map((f) => ({ ...f, status: "uploading" as const, progress: 0 }))
    );

    try {
      // In a real implementation, we would:
      // 1. Read each DICOM file
      // 2. Extract metadata using dicom-parser
      // 3. Upload file to S3 using storagePut
      // 4. Create study/series/instance records in database

      // For now, simulate upload progress
      for (let i = 0; i < files.length; i++) {
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, progress } : f
            )
          );
        }
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "success" as const, progress: 100 } : f
          )
        );
      }

      // Call backend mutation
      await uploadMutation.mutateAsync({
        patientId,
        files: files.map((f) => f.file.name),
      });
    } catch (error) {
      console.error("Upload error:", error);
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: "error" as const,
          error: "Upload failed",
        }))
      );
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Upload DICOM Files</CardTitle>
        <CardDescription>
          Drag and drop DICOM files or click to browse
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-foreground font-medium mb-2">
            Drop DICOM files here or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supports .dcm, .dicom files and compressed archives
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".dcm,.dicom"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Selected Files ({files.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiles([])}
                className="border-border"
              >
                Clear All
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((fileItem, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50"
                >
                  <FileImage className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {fileItem.file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    {fileItem.status === "uploading" && (
                      <Progress value={fileItem.progress} className="mt-2" />
                    )}
                    {fileItem.status === "error" && (
                      <div className="text-xs text-red-500 mt-1">
                        {fileItem.error}
                      </div>
                    )}
                  </div>
                  {fileItem.status === "success" && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                  {fileItem.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <Button
            onClick={handleUpload}
            disabled={files.some((f) => f.status === "uploading") || uploadMutation.isPending}
            className="w-full"
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload Files"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
