import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileUp, Download, Loader2 } from "lucide-react";
import { parseCSV, generateCSVTemplate, downloadCSV } from "@/lib/csv-parser";
import { useToast } from "@/hooks/use-toast";

interface CSVUploadProps<T> {
  onDataParsed: (data: T[]) => void;
  headerMapping: Record<string, string>;
  isUploading: boolean;
  templateHeaders: string[];
  templateFilename: string;
  acceptedFileTypes?: string;
  maxFileSizeInMB?: number;
  instructions?: string;
}

export function CSVUpload<T>({
  onDataParsed,
  headerMapping,
  isUploading,
  templateHeaders,
  templateFilename,
  acceptedFileTypes = ".csv",
  maxFileSizeInMB = 10,
  instructions
}: CSVUploadProps<T>) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) {
      return;
    }

    // Validate file type
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'csv') {
      setError("Please upload a valid CSV file");
      return;
    }

    // Validate file size
    const maxSizeBytes = maxFileSizeInMB * 1024 * 1024;
    if (selectedFile.size > maxSizeBytes) {
      setError(`File size must be less than ${maxFileSizeInMB}MB`);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    try {
      setError(null);
      const parsedData = await parseCSV<T>(file, headerMapping);
      onDataParsed(parsedData);
      toast({
        title: "File processed successfully",
        description: `${parsedData.length} records ready to be imported.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to parse CSV file";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error processing file",
        description: errorMessage,
      });
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate(templateHeaders);
    downloadCSV(template, templateFilename);
  };

  return (
    <div className="space-y-4 border rounded-lg p-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Upload CSV</h3>
        {instructions && <p className="text-sm text-muted-foreground">{instructions}</p>}
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="csv-file">Select CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept={acceptedFileTypes}
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button 
            type="button" 
            onClick={handleUpload} 
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileUp className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleDownloadTemplate}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}