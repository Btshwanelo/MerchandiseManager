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
import { Loader2, Upload, FileUp, RefreshCw, Search, ZoomIn, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ProductFlow } from "@shared/schema";
import { UserRole } from "@shared/schema";

const FlowsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [imagePreviewDialogOpen, setImagePreviewDialogOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<ProductFlow | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState<string>("");
  const [newFlowDescription, setNewFlowDescription] = useState<string>("");
  const [newFlowFile, setNewFlowFile] = useState<File | null>(null);

  // Check if user can manage flows
  const canManageFlows = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;

  // Fetch product flows
  const { data: flows, isLoading, error, refetch } = useQuery<ProductFlow[]>({
    queryKey: ["/api/product-flows"],
  });

  // Upload new flow mutation
  const uploadFlowMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/product-flows", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-flows"] });
      setUploadDialogOpen(false);
      resetUploadForm();
      toast({
        title: "Flow uploaded",
        description: "The product flow has been successfully uploaded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to upload flow",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewFlowFile(e.target.files[0]);
    }
  };

  // Reset upload form
  const resetUploadForm = () => {
    setNewFlowName("");
    setNewFlowDescription("");
    setNewFlowFile(null);
  };

  // Handle flow upload
  const handleUploadFlow = () => {
    if (!newFlowName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the flow.",
        variant: "destructive"
      });
      return;
    }

    if (!newFlowFile) {
      toast({
        title: "File required",
        description: "Please select a file to upload.",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append("name", newFlowName);
    formData.append("description", newFlowDescription);
    formData.append("flowImage", newFlowFile);

    uploadFlowMutation.mutate(formData);
  };

  // View flow image
  const handleViewFlow = (flow: ProductFlow) => {
    setSelectedFlow(flow);
    setImagePreviewDialogOpen(true);
  };

  // Filter flows based on search query
  const filteredFlows = flows?.filter(flow => 
    flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (flow.description && flow.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Product Flows</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          {canManageFlows && (
            <Button 
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Flow
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flow Diagrams</CardTitle>
          <CardDescription>
            Reference diagrams showing the proper arrangement of products on shelves
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search flows by name or description..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Flows Grid */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">
              Error loading product flows. Please try again.
            </div>
          ) : filteredFlows?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 p-4 bg-muted rounded-full">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No product flows found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? "Try adjusting your search" : "Upload product flows to see them here"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Using mock data until API is connected */}
              {[
                {
                  id: 1,
                  name: "Standard Shelf Layout",
                  description: "Recommended arrangement for standard shelving",
                  flowImage: "https://placehold.co/600x400/e2e8f0/475569?text=Shelf+Layout+Diagram",
                  createdAt: new Date("2023-10-15")
                },
                {
                  id: 2,
                  name: "End Cap Display",
                  description: "Premium arrangement for end cap displays with featured products",
                  flowImage: "https://placehold.co/600x400/e2e8f0/475569?text=End+Cap+Layout",
                  createdAt: new Date("2023-11-02")
                },
                {
                  id: 3,
                  name: "Seasonal Products",
                  description: "Special arrangement for seasonal promotional products",
                  flowImage: "https://placehold.co/600x400/e2e8f0/475569?text=Seasonal+Layout",
                  createdAt: new Date("2023-12-10")
                }
              ].map((flow) => (
                <Card key={flow.id} className="overflow-hidden flex flex-col">
                  <div 
                    className="h-48 bg-muted cursor-pointer relative group"
                    onClick={() => handleViewFlow(flow as any)}
                  >
                    <img 
                      src={flow.flowImage} 
                      alt={flow.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardContent className="pt-4 flex-1 flex flex-col">
                    <h3 className="font-medium text-lg">{flow.name}</h3>
                    {flow.description && (
                      <p className="text-muted-foreground text-sm mt-1">{flow.description}</p>
                    )}
                    <div className="mt-auto pt-4 text-xs text-muted-foreground">
                      Added: {flow.createdAt.toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flow Image Preview Dialog */}
      <Dialog open={imagePreviewDialogOpen} onOpenChange={setImagePreviewDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedFlow?.name}</DialogTitle>
            {selectedFlow?.description && (
              <p className="text-sm text-muted-foreground mt-1">{selectedFlow.description}</p>
            )}
          </DialogHeader>
          {selectedFlow && (
            <div className="overflow-hidden rounded-md">
              <img 
                src={selectedFlow.flowImage} 
                alt={selectedFlow.name} 
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Flow Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Product Flow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Enter flow name"
                value={newFlowName}
                onChange={(e) => setNewFlowName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                placeholder="Enter flow description"
                value={newFlowDescription}
                onChange={(e) => setNewFlowDescription(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Flow Image</label>
              <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center">
                {newFlowFile ? (
                  <div className="text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium">{newFlowFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(newFlowFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setNewFlowFile(null)}
                    >
                      Change file
                    </Button>
                  </div>
                ) : (
                  <>
                    <FileUp className="h-8 w-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Click to upload or drag and drop</p>
                    <Button asChild size="sm">
                      <label>
                        Browse Files
                        <input
                          type="file"
                          accept="image/*"
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
              onClick={handleUploadFlow}
              disabled={uploadFlowMutation.isPending}
            >
              {uploadFlowMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowsPage;