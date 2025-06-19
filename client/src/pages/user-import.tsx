import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
  Download,
  Info,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { parseCSV } from "@/lib/csv-parser";
import { validateFileUpload } from "@/lib/file-utils";

// Define the user import type
type UserImport = {
  username: string;
  name: string;
  email: string;
  role: string;
  password: string;
};

// Define the import result type
type ImportResult = {
  results: {
    username: string;
    name: string;
    email: string;
    role: string;
    success: boolean;
  }[];
  errors: {
    item: UserImport;
    error: string;
  }[];
  totalSuccessful: number;
  totalFailed: number;
  message: string;
};

const UserImportPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<UserImport[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is admin
  const isAdmin = user?.role === UserRole.ADMIN;

  // Handle file upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      // Validate file size (4MB limit)
      const validFiles: File[] = [];
      for (const file of newFiles) {
        const validation = validateFileUpload(file);
        if (!validation.valid) {
          toast({
            title: "File too large",
            description: `${file.name}: ${validation.error}`,
            variant: "destructive",
          });
        } else {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        // Add your logic to handle valid files here
        // e.g., setFileUploads([...fileUploads, ...validFiles]);
      }
    }
  };

  // Import users mutation
  const importUsersMutation = useMutation({
    mutationFn: async (users: UserImport[]) => {
      const res = await apiRequest("POST", "/api/users/bulk-import", { users });
      return await res.json();
    },
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Users imported",
        description: `${data.totalSuccessful} users imported successfully. ${data.totalFailed} failed.`,
        variant: data.totalFailed > 0 ? "destructive" : "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to import users",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle import submit
  const handleImport = () => {
    if (parsedData.length > 0) {
      importUsersMutation.mutate(parsedData);
    }
  };

  // Get template content for download
  const getTemplateContent = () => {
    const headers = "username,name,email,role,password\n";
    const exampleRows = [
      "john_doe,John Doe,john@example.com,merchandiser,password123",
      "jane_mgr,Jane Manager,jane@example.com,manager,password123",
    ].join("\n");
    return headers + exampleRows;
  };

  // Download CSV template
  const downloadTemplate = () => {
    const content = getTemplateContent();
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reset the form
  const handleReset = () => {
    setUploadedFile(null);
    setParsedData([]);
    setParseError(null);
    setImportResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // If not an admin, redirect to home
  if (user && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-center mb-4">
          Only administrators can access this page.
        </p>
        <Button asChild variant="default">
          <Link href="/">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link href="/users">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Bulk Import Users</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Upload a CSV file containing user data. The file should include
                the following columns: username, name, email, role, and
                password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!uploadedFile ? (
                <div className="border-2 border-dashed border-muted rounded-lg p-8 flex flex-col items-center justify-center space-y-4">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium">Drag and drop your CSV file</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      or click to browse from your computer
                    </p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                    id="csv-upload"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={downloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <FileText className="h-4 w-4 mr-2" />
                      Select CSV File
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-primary/10 rounded-md mr-3">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {uploadedFile.size > 1024
                            ? `${(uploadedFile.size / 1024).toFixed(2)} KB`
                            : `${uploadedFile.size} bytes`}
                          {parsedData.length > 0 &&
                            ` - ${parsedData.length} users found`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleReset}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  </div>

                  {uploadProgress < 100 && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} />
                      <p className="text-xs text-muted-foreground">
                        Processing file... {uploadProgress}%
                      </p>
                    </div>
                  )}

                  {parseError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{parseError}</AlertDescription>
                    </Alert>
                  )}

                  {parsedData.length > 0 && (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedData.slice(0, 5).map((user, index) => (
                            <TableRow key={index}>
                              <TableCell>{user.username}</TableCell>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{user.role}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {parsedData.length > 5 && (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center text-muted-foreground"
                              >
                                {parsedData.length - 5} more users
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4">
                    <Button variant="outline" onClick={handleReset}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={
                        parsedData.length === 0 || importUsersMutation.isPending
                      }
                    >
                      {importUsersMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Import {parsedData.length} Users
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {importResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
                <CardDescription>{importResult.message}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6">
                  {importResult.totalSuccessful > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center text-green-600">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Successful Imports ({importResult.totalSuccessful})
                      </h3>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importResult.results
                              .slice(0, 5)
                              .map((user, index) => (
                                <TableRow key={index}>
                                  <TableCell>{user.username}</TableCell>
                                  <TableCell>{user.name}</TableCell>
                                  <TableCell>{user.email}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{user.role}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            {importResult.results.length > 5 && (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="text-center text-muted-foreground"
                                >
                                  {importResult.results.length - 5} more users
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {importResult.totalFailed > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center text-destructive">
                        <XCircle className="h-4 w-4 mr-1" />
                        Failed Imports ({importResult.totalFailed})
                      </h3>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Error</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importResult.errors.map((error, index) => (
                              <TableRow key={index}>
                                <TableCell>{error.item.username}</TableCell>
                                <TableCell>{error.item.email}</TableCell>
                                <TableCell className="text-destructive text-sm">
                                  {error.error}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
              <CardDescription>
                How to prepare your CSV file for user import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Required Fields</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                  <li>
                    <strong>username</strong>: Unique login ID for the user
                  </li>
                  <li>
                    <strong>name</strong>: Full name of the user
                  </li>
                  <li>
                    <strong>email</strong>: Valid email address
                  </li>
                  <li>
                    <strong>role</strong>: User role (admin, manager, or
                    merchandiser)
                  </li>
                  <li>
                    <strong>password</strong>: Initial password (min. 6
                    characters)
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Format Notes</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                  <li>
                    Ensure each value is properly formatted and quoted if it
                    contains commas
                  </li>
                  <li>
                    The first row should contain column headers exactly as
                    listed above
                  </li>
                </ul>
              </div>

              <Separator />

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Useful Information</AlertTitle>
                <AlertDescription className="text-xs space-y-2">
                  <p>Download our template CSV to get started quickly.</p>
                  <p>
                    Users will be able to log in immediately with the provided
                    passwords. Consider implementing a password change
                    requirement on first login.
                  </p>
                  <p>
                    For security reasons, you may want to send users their
                    credentials separately after import.
                  </p>
                </AlertDescription>
              </Alert>

              <Button
                className="w-full"
                variant="outline"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserImportPage;
