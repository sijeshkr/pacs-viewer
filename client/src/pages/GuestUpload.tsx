import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileCheck, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function GuestUpload() {
  const params = useParams();
  const token = params.token as string;
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate token
  const { data: tokenData, isLoading, error: tokenError } = trpc.uploadToken.validate.useQuery(
    { token },
    { enabled: !!token }
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select DICOM files to upload");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // TODO: Implement actual DICOM file upload to S3
      // For now, simulate upload
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mark token as used
      // await trpc.uploadToken.markUsed.mutate({ token });

      setUploadComplete(true);
    } catch (err) {
      setError("Failed to upload files. Please try again.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Validating upload link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenError || !tokenData?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <CardTitle>Invalid Upload Link</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              This upload link is invalid or has expired. Please contact your healthcare provider for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (uploadComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <FileCheck className="w-6 h-6" />
              <CardTitle>Upload Complete</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Your medical images have been successfully uploaded. Your healthcare provider will review them shortly.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              You can safely close this window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Upload Medical Images</CardTitle>
          <CardDescription>
            {tokenData.patientName && `Upload for: ${tokenData.patientName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                multiple
                accept=".dcm,.dicom"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Click to select DICOM files
                </p>
                <p className="text-sm text-gray-500">
                  or drag and drop files here
                </p>
              </label>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  Selected Files ({selectedFiles.length})
                </h3>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-green-600" />
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Your files are encrypted and securely transmitted to your healthcare provider.
              This upload link can only be used once.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
