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
import { Loader2, Upload, FileUp, RefreshCw, Search, Download, FileText, File, Eye, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ListPrice } from "@shared/schema";
import { UserRole } from "@shared/schema";

const ListPricesPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newPriceListName, setNewPriceListName] = useState<string>("");
  const [newPriceListDescription, setNewPriceListDescription] = useState<string>("");
  const [newPriceListFile, setNewPriceListFile] = useState<File | null>(null);
  const [viewFileDialogOpen, setViewFileDialogOpen] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState<ListPrice | null>(null);

  // Check if user can manage price lists
  const canManagePriceLists = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;

  // Fetch price lists
  const { data: priceLists, isLoading, error, refetch } = useQuery<ListPrice[]>({
    queryKey: ["/api/list-prices"],
  });

  // Upload new price list mutation
  const uploadPriceListMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/list-prices", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/list-prices"] });
      setUploadDialogOpen(false);
      resetUploadForm();
      toast({
        title: "Price list uploaded",
        description: "The price list has been successfully uploaded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to upload price list",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewPriceListFile(e.target.files[0]);
    }
  };

  // Reset upload form
  const resetUploadForm = () => {
    setNewPriceListName("");
    setNewPriceListDescription("");
    setNewPriceListFile(null);
  };

  // Handle price list upload
  const handleUploadPriceList = () => {
    if (!newPriceListName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the price list.",
        variant: "destructive"
      });
      return;
    }

    if (!newPriceListFile) {
      toast({
        title: "File required",
        description: "Please select a file to upload.",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append("name", newPriceListName);
    formData.append("description", newPriceListDescription);
    formData.append("file", newPriceListFile);

    uploadPriceListMutation.mutate(formData);
  };

  // Handle view price list
  const handleViewPriceList = (priceList: ListPrice) => {
    setSelectedPriceList(priceList);
    setViewFileDialogOpen(true);
  };

  // Filter price lists based on search query
  const filteredPriceLists = priceLists?.filter(priceList => 
    priceList.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (priceList.description && priceList.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
        <h1 className="text-2xl font-bold">List Prices</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          {canManagePriceLists && (
            <Button 
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Price List
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Documentation</CardTitle>
          <CardDescription>
            Official price lists and pricing guidelines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search price lists by name or description..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Price Lists Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">
              Error loading price lists. Please try again.
            </div>
          ) : filteredPriceLists?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 p-4 bg-muted rounded-full">
                <DollarSign className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No price lists found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? "Try adjusting your search" : "Upload price lists to see them here"}
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
                      name: "Wholesale Price List 2023.xlsx",
                      description: "Current wholesale price list for all products",
                      fileUrl: "https://example.com/files/wholesale-prices.xlsx",
                      createdAt: new Date("2023-01-10"),
                      fileSize: 320000
                    },
                    {
                      id: 2,
                      name: "Retail Price Guidelines.pdf",
                      description: "Suggested retail pricing and margin information",
                      fileUrl: "https://example.com/files/retail-guidelines.pdf",
                      createdAt: new Date("2023-01-18"),
                      fileSize: 1200000
                    },
                    {
                      id: 3,
                      name: "Special Promotion Pricing Q1 2023.xlsx",
                      description: "Promotional pricing for Q1 2023 campaign",
                      fileUrl: "https://example.com/files/q1-promotions.xlsx",
                      createdAt: new Date("2023-02-01"),
                      fileSize: 450000
                    }
                  ].map((priceList) => (
                    <tr key={priceList.id} className="border-t">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {getFileIcon(priceList.name)}
                          <span className="ml-2 font-medium">{priceList.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {priceList.description}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {priceList.createdAt.toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {formatFileSize(priceList.fileSize)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewPriceList(priceList as any)}
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

      {/* Upload Price List Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Price List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Enter price list name"
                value={newPriceListName}
                onChange={(e) => setNewPriceListName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                placeholder="Enter price list description"
                value={newPriceListDescription}
                onChange={(e) => setNewPriceListDescription(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">File</label>
              <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center">
                {newPriceListFile ? (
                  <div className="text-center">
                    {getFileIcon(newPriceListFile.name)}
                    <p className="text-sm font-medium mt-2">{newPriceListFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(newPriceListFile.size)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setNewPriceListFile(null)}
                    >
                      Change file
                    </Button>
                  </div>
                ) : (
                  <>
                    <FileUp className="h-8 w-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mb-4">PDF, Excel, or CSV files</p>
                    <Button asChild size="sm">
                      <label>
                        Browse Files
                        <input
                          type="file"
                          accept=".pdf,.xls,.xlsx,.csv"
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
              onClick={handleUploadPriceList}
              disabled={uploadPriceListMutation.isPending}
            >
              {uploadPriceListMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View File Dialog */}
      <Dialog open={viewFileDialogOpen} onOpenChange={setViewFileDialogOpen}>
        <DialogContent className="sm:max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedPriceList?.name}</DialogTitle>
            {selectedPriceList?.description && (
              <p className="text-sm text-muted-foreground mt-1">{selectedPriceList.description}</p>
            )}
          </DialogHeader>
          {selectedPriceList && (
            <div className="flex-1 overflow-hidden rounded-md h-full">
              {/* Excel/PDF Viewer - in actual implementation, you would use a viewer component */}
              <div className="w-full h-full flex items-center justify-center bg-muted/20">
                <div className="text-center">
                  {getFileIcon(selectedPriceList.name)}
                  <p className="text-lg font-medium mt-4 mb-2">File Preview</p>
                  <p className="mb-4 text-muted-foreground">
                    Preview not available. You can download the file to view it.
                  </p>
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

export default ListPricesPage;