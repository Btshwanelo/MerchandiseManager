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
import { Loader2, Upload, FileUp, RefreshCw, Search, Download, FileText, File, Eye, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Deal } from "@shared/schema";
import { UserRole } from "@shared/schema";

const DealsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newDealName, setNewDealName] = useState<string>("");
  const [newDealDescription, setNewDealDescription] = useState<string>("");
  const [newDealFile, setNewDealFile] = useState<File | null>(null);
  const [viewFileDialogOpen, setViewFileDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Check if user can manage deals
  const canManageDeals = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;

  // Fetch deals
  const { data: deals, isLoading, error, refetch } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  // Upload new deal mutation
  const uploadDealMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/deals", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setUploadDialogOpen(false);
      resetUploadForm();
      toast({
        title: "Deal uploaded",
        description: "The deal information has been successfully uploaded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to upload deal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewDealFile(e.target.files[0]);
    }
  };

  // Reset upload form
  const resetUploadForm = () => {
    setNewDealName("");
    setNewDealDescription("");
    setNewDealFile(null);
  };

  // Handle deal upload
  const handleUploadDeal = () => {
    if (!newDealName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the deal.",
        variant: "destructive"
      });
      return;
    }

    if (!newDealFile) {
      toast({
        title: "File required",
        description: "Please select a file to upload.",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append("name", newDealName);
    formData.append("description", newDealDescription);
    formData.append("file", newDealFile);

    uploadDealMutation.mutate(formData);
  };

  // Handle view deal
  const handleViewDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setViewFileDialogOpen(true);
  };

  // Filter deals based on search query
  const filteredDeals = deals?.filter(deal => 
    deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (deal.description && deal.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
        <h1 className="text-2xl font-bold">Deals & Discounts</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          {canManageDeals && (
            <Button 
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Deal
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Promotional Deals</CardTitle>
          <CardDescription>
            Available promotional deals and discounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals by name or description..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Deals Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">
              Error loading deals. Please try again.
            </div>
          ) : filteredDeals?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 p-4 bg-muted rounded-full">
                <Tag className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No deals found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? "Try adjusting your search" : "Upload deals to see them here"}
              </p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Deal</th>
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
                      name: "Summer Promotion 2023.xlsx",
                      description: "Special discounts for summer products",
                      fileUrl: "https://example.com/files/summer-promo.xlsx",
                      createdAt: new Date("2023-05-01"),
                      fileSize: 280000
                    },
                    {
                      id: 2,
                      name: "Volume Discounts.pdf",
                      description: "Bulk purchase discounts for all categories",
                      fileUrl: "https://example.com/files/volume-discounts.pdf",
                      createdAt: new Date("2023-01-15"),
                      fileSize: 950000
                    },
                    {
                      id: 3,
                      name: "Regional Promotions Q2 2023.xlsx",
                      description: "Region-specific promotional discounts",
                      fileUrl: "https://example.com/files/region-promos.xlsx",
                      createdAt: new Date("2023-04-10"),
                      fileSize: 420000
                    }
                  ].map((deal) => (
                    <tr key={deal.id} className="border-t">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {getFileIcon(deal.name)}
                          <span className="ml-2 font-medium">{deal.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {deal.description}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {deal.createdAt.toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {formatFileSize(deal.fileSize)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDeal(deal as any)}
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

      {/* Upload Deal Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Enter deal name"
                value={newDealName}
                onChange={(e) => setNewDealName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                placeholder="Enter deal description"
                value={newDealDescription}
                onChange={(e) => setNewDealDescription(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">File</label>
              <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center">
                {newDealFile ? (
                  <div className="text-center">
                    {getFileIcon(newDealFile.name)}
                    <p className="text-sm font-medium mt-2">{newDealFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(newDealFile.size)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setNewDealFile(null)}
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
              onClick={handleUploadDeal}
              disabled={uploadDealMutation.isPending}
            >
              {uploadDealMutation.isPending && (
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
            <DialogTitle>{selectedDeal?.name}</DialogTitle>
            {selectedDeal?.description && (
              <p className="text-sm text-muted-foreground mt-1">{selectedDeal.description}</p>
            )}
          </DialogHeader>
          {selectedDeal && (
            <div className="flex-1 overflow-hidden rounded-md h-full">
              {/* Excel/PDF Viewer - in actual implementation, you would use a viewer component */}
              <div className="w-full h-full flex items-center justify-center bg-muted/20">
                <div className="text-center">
                  {getFileIcon(selectedDeal.name)}
                  <p className="text-lg font-medium mt-4 mb-2">Deal Preview</p>
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

export default DealsPage;