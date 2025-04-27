import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Loader2, Upload, FileUp, RefreshCw, Search, Download, FileText, File, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ProductSheet } from "@shared/schema";
import { UserRole } from "@shared/schema";

const ProductSheetsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState<string>("");
  const [newSheetDescription, setNewSheetDescription] = useState<string>("");
  const [newSheetFile, setNewSheetFile] = useState<File | null>(null);
  const [viewPdfDialogOpen, setViewPdfDialogOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<ProductSheet | null>(null);

  // Check if user can manage product sheets
  const canManageSheets = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;

  // Fetch product sheets
  const { data: sheets, isLoading, error, refetch } = useQuery<ProductSheet[]>({
    queryKey: ["/api/product-sheets"],
  });

  // Upload new sheet mutation
  const uploadSheetMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/product-sheets", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-sheets"] });
      setUploadDialogOpen(false);
      resetUploadForm();
      toast({
        title: "Product sheet uploaded",
        description: "The product sheet has been successfully uploaded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to upload product sheet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewSheetFile(e.target.files[0]);
    }
  };

  // Reset upload form
  const resetUploadForm = () => {
    setNewSheetName("");
    setNewSheetDescription("");
    setNewSheetFile(null);
  };

  // Handle sheet upload
  const handleUploadSheet = () => {
    if (!newSheetName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the product sheet.",
        variant: "destructive"
      });
      return;
    }

    if (!newSheetFile) {
      toast({
        title: "File required",
        description: "Please select a file to upload.",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append("name", newSheetName);
    formData.append("description", newSheetDescription);
    formData.append("file", newSheetFile);

    uploadSheetMutation.mutate(formData);
  };

  // Handle view sheet
  const handleViewSheet = (sheet: ProductSheet) => {
    setSelectedSheet(sheet);
    setViewPdfDialogOpen(true);
  };

  // Filter sheets based on search query
  const filteredSheets = sheets?.filter(sheet => 
    sheet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sheet.description && sheet.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Format file size
  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  // Get file icon based on extension
  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-500" />;
      case 'xlsx':
      case 'xls':
        return <FileText className="h-6 w-6 text-green-600" />;
      case 'docx':
      case 'doc':
        return <FileText className="h-6 w-6 text-blue-600" />;
      default:
        return <File className="h-6 w-6 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Product Sheets</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          {canManageSheets && (
            <Button 
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Sheet
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Documentation</CardTitle>
          <CardDescription>
            Reference documents with detailed product specifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product sheets by name or description..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Product Sheets Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">
              Error loading product sheets. Please try again.
            </div>
          ) : filteredSheets?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 p-4 bg-muted rounded-full">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No product sheets found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? "Try adjusting your search" : "Upload product sheets to see them here"}
              </p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">File</th>
                    <th className="text-left py-3 px-4 font-medium">Description</th>
                    <th className="text-left py-3 px-4 font-medium">Date Added</th>
                    <th className="text-left py-3 px-4 font-medium">Size</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Using mock data until API is connected */}
                  {[
                    {
                      id: 1,
                      name: "Product Catalog Q1 2023.pdf",
                      description: "Complete product listing with codes and specifications",
                      fileUrl: "https://example.com/files/catalog.pdf",
                      createdAt: new Date("2023-01-15"),
                      fileSize: 2500000
                    },
                    {
                      id: 2,
                      name: "Price Sheet 2023.xlsx",
                      description: "Current pricing for all products",
                      fileUrl: "https://example.com/files/price-sheet.xlsx",
                      createdAt: new Date("2023-01-20"),
                      fileSize: 450000
                    },
                    {
                      id: 3,
                      name: "Product Specifications.pdf",
                      description: "Detailed technical specifications for all products",
                      fileUrl: "https://example.com/files/specs.pdf",
                      createdAt: new Date("2023-02-05"),
                      fileSize: 3200000
                    }
                  ].map((sheet) => (
                    <tr key={sheet.id} className="border-t">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {getFileIcon(sheet.name)}
                          <span className="ml-2 font-medium">{sheet.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {sheet.description}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {sheet.createdAt.toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {formatFileSize(sheet.fileSize)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewSheet(sheet as any)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Sheet Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Product Sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Enter product sheet name"
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                placeholder="Enter sheet description"
                value={newSheetDescription}
                onChange={(e) => setNewSheetDescription(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">File</label>
              <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center">
                {newSheetFile ? (
                  <div className="text-center">
                    {getFileIcon(newSheetFile.name)}
                    <p className="text-sm font-medium mt-2">{newSheetFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(newSheetFile.size)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setNewSheetFile(null)}
                    >
                      Change file
                    </Button>
                  </div>
                ) : (
                  <>
                    <FileUp className="h-8 w-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mb-4">PDF, Word, or Excel files</p>
                    <Button asChild size="sm">
                      <label>
                        Browse Files
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUploadSheet}
              disabled={uploadSheetMutation.isPending}
            >
              {uploadSheetMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View PDF Dialog */}
      <Dialog open={viewPdfDialogOpen} onOpenChange={setViewPdfDialogOpen}>
        <DialogContent className="sm:max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedSheet?.name}</DialogTitle>
            {selectedSheet?.description && (
              <p className="text-sm text-muted-foreground mt-1">{selectedSheet.description}</p>
            )}
          </DialogHeader>
          {selectedSheet && (
            <div className="flex-1 overflow-hidden rounded-md h-full">
              {/* PDF Viewer - in actual implementation, you would use a PDF viewer component */}
              <div className="w-full h-full flex items-center justify-center bg-muted/20">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="mb-4">PDF Viewer would be embedded here</p>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductSheetsPage;