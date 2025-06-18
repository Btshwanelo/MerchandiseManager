import React, { useState, useCallback } from "react";
import { Upload, X, Eye, File, ImageIcon } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent } from "./card";
import { useToast } from "../../hooks/use-toast";
import {
  uploadFile,
  processImagePaths,
  createPreviewUrl,
  revokePreviewUrl,
  validateFileUpload,
  type FileInfo,
} from "../../lib/file-utils";

interface FileUploadProps {
  files: (File | FileInfo)[];
  onFilesChange: (files: (File | FileInfo)[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  files,
  onFilesChange,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ],
  className = "",
  disabled = false,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []);

      if (files.length + selectedFiles.length > maxFiles) {
        toast({
          title: "Too many files",
          description: `Maximum ${maxFiles} files allowed`,
          variant: "destructive",
        });
        return;
      }

      // Validate files
      for (const file of selectedFiles) {
        const validation = validateFileUpload(file, {
          maxSize: maxFileSize,
          allowedTypes,
        });

        if (!validation.valid) {
          toast({
            title: "Invalid file",
            description: validation.error,
            variant: "destructive",
          });
          return;
        }
      }

      // Upload files to server
      setIsUploading(true);
      try {
        const uploadedFiles: FileInfo[] = [];

        for (const file of selectedFiles) {
          try {
            const uploadedFile = await uploadFile(file);
            uploadedFiles.push(uploadedFile);
          } catch (error) {
            console.error("Failed to upload file:", error);
            toast({
              title: "Upload failed",
              description: `Failed to upload ${file.name}`,
              variant: "destructive",
            });
          }
        }

        onFilesChange([...files, ...uploadedFiles]);

        if (uploadedFiles.length > 0) {
          toast({
            title: "Upload successful",
            description: `Uploaded ${uploadedFiles.length} file(s)`,
          });
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Upload failed",
          description: "An error occurred during upload",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }

      // Reset input
      event.target.value = "";
    },
    [files, maxFiles, maxFileSize, allowedTypes, onFilesChange, toast]
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      const fileToRemove = files[index];

      // Clean up preview URL if it's a File object
      if (fileToRemove instanceof File) {
        const url = createPreviewUrl(fileToRemove);
        revokePreviewUrl(url);
      }

      const newFiles = files.filter((_, i) => i !== index);
      onFilesChange(newFiles);
    },
    [files, onFilesChange]
  );

  const handlePreviewFile = useCallback((file: File | FileInfo) => {
    const url = createPreviewUrl(file);
    setPreviewUrl(url);
  }, []);

  const handleClosePreview = useCallback(() => {
    if (previewUrl) {
      revokePreviewUrl(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  return (
    <div className={className}>
      {/* File Upload Area */}
      <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">
                {isUploading
                  ? "Uploading..."
                  : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {allowedTypes.join(", ").replace("image/", "")} files up to{" "}
                {Math.round(maxFileSize / 1024 / 1024)}MB
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={disabled || isUploading}
              className="mt-2"
            >
              {isUploading ? "Uploading..." : "Select Files"}
            </Button>
            <input
              id="file-upload"
              type="file"
              multiple
              accept={allowedTypes.join(",")}
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled || isUploading}
            />
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">
            Uploaded Files ({files.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file, index) => (
              <div
                key={index}
                className="relative group border rounded-md overflow-hidden"
              >
                {/* File Preview */}
                <div className="aspect-square bg-muted/20 flex items-center justify-center">
                  {file instanceof File ? (
                    // Local file preview
                    <img
                      src={createPreviewUrl(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // Server file preview
                    <img
                      src={file.url}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center">
                              <ImageIcon class="h-8 w-8 text-muted-foreground" />
                            </div>
                          `;
                        }
                      }}
                    />
                  )}
                </div>

                {/* File Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                  <p className="truncate">
                    {file instanceof File ? file.name : file.filename}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePreviewFile(file)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleRemoveFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-lg">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 h-8 w-8 p-0"
              onClick={handleClosePreview}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
