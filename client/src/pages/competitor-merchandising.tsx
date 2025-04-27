import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2, Plus, Upload, Store, Camera, Save, File, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Store as StoreType } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

const CompetitorMerchandisingPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [fileUploads, setFileUploads] = useState<File[]>([]);
  const [imagePreviewDialogOpen, setImagePreviewDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Competitor info
  const [brand, setBrand] = useState<string>("");
  const [productDescription, setProductDescription] = useState<string>("");
  const [promotionalPrice, setPromotionalPrice] = useState<string>("");

  // List of competitors
  const [competitors, setCompetitors] = useState<Array<{
    id: number;
    brand: string;
    productDescription: string;
    promotionalPrice: number | null;
    pictures: File[];
  }>>([]);

  // Fetch stores
  const { data: stores, isLoading: isLoadingStores } = useQuery<StoreType[]>({
    queryKey: ["/api/stores"],
  });

  // Add competitor
  const handleAddCompetitor = () => {
    if (!brand.trim()) {
      toast({
        title: "Brand required",
        description: "Please enter the competitor brand name.",
        variant: "destructive"
      });
      return;
    }

    if (!productDescription.trim()) {
      toast({
        title: "Product description required",
        description: "Please enter a description of the competitor product.",
        variant: "destructive"
      });
      return;
    }

    // Convert price to cents or null if empty
    const priceInCents = promotionalPrice ? Math.round(parseFloat(promotionalPrice) * 100) : null;
    
    // Validate price if provided
    if (promotionalPrice && isNaN(priceInCents!)) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price or leave it empty.",
        variant: "destructive"
      });
      return;
    }

    // Add competitor with pictures
    setCompetitors([
      ...competitors,
      {
        id: Date.now(), // Temporary ID for frontend use
        brand,
        productDescription,
        promotionalPrice: priceInCents,
        pictures: [...fileUploads],
      }
    ]);
    
    // Reset form
    setBrand("");
    setProductDescription("");
    setPromotionalPrice("");
    setFileUploads([]);
  };

  // Remove competitor
  const handleRemoveCompetitor = (id: number) => {
    setCompetitors(competitors.filter(c => c.id !== id));
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFileUploads([...fileUploads, ...newFiles]);
    }
  };

  // Remove uploaded file
  const handleRemoveFile = (index: number) => {
    setFileUploads(fileUploads.filter((_, i) => i !== index));
  };

  // Preview image
  const handlePreviewImage = (file: File) => {
    const url = URL.createObjectURL(file);
    setSelectedImage(url);
    setImagePreviewDialogOpen(true);
  };

  // View competitor images
  const handleViewCompetitorImages = (pictures: File[]) => {
    if (pictures.length > 0) {
      const url = URL.createObjectURL(pictures[0]);
      setSelectedImage(url);
      setImagePreviewDialogOpen(true);
    }
  };

  // Create competitor merchandising mutation
  const createCompetitorMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/competitor-merchandising", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitor-merchandising"] });
      toast({
        title: "Competitor data submitted",
        description: "The competitor merchandising data has been successfully submitted.",
      });
      // Reset form
      setSelectedStore("");
      setCompetitors([]);
    },
    onError: (error) => {
      toast({
        title: "Failed to submit competitor data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit competitor data
  const handleSubmit = async () => {
    if (!selectedStore) {
      toast({
        title: "Store required",
        description: "Please select a store for this report.",
        variant: "destructive"
      });
      return;
    }

    if (competitors.length === 0) {
      toast({
        title: "No competitor data added",
        description: "Please add at least one competitor product.",
        variant: "destructive"
      });
      return;
    }

    // In a real implementation, we would upload the images to a storage service
    // and then submit the form data with the image URLs
    // For this prototype, we're just simulating the process

    const formData = new FormData();
    formData.append("storeId", selectedStore);
    formData.append("competitors", JSON.stringify(competitors.map(c => ({
      brand: c.brand,
      productDescription: c.productDescription,
      promotionalPrice: c.promotionalPrice
    }))));
    
    // Add pictures for each competitor
    competitors.forEach((competitor, idx) => {
      competitor.pictures.forEach(file => {
        formData.append(`competitor_${idx}_pictures`, file);
      });
    });

    createCompetitorMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Competitor Merchandising</h1>
        <Button 
          onClick={handleSubmit}
          disabled={createCompetitorMutation.isPending}
        >
          {createCompetitorMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Submit Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Store</label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a store..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingStores ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading stores...
                      </div>
                    ) : (
                      stores?.map((store) => (
                        <SelectItem key={store.id} value={store.id.toString()}>
                          <div className="flex items-center">
                            <Store className="h-4 w-4 mr-2 text-muted-foreground" />
                            {store.name} - {store.location}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Add Competitor Product</CardTitle>
              <div className="space-x-2">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md flex items-center text-sm">
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Photos
                  </div>
                  <input 
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Competitor information form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand</label>
                  <Input
                    placeholder="Enter competitor brand name"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product Description</label>
                  <Textarea
                    placeholder="Describe the competitor product"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Promotional Price (optional)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      value={promotionalPrice}
                      onChange={(e) => setPromotionalPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Uploaded Files */}
              {fileUploads.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Uploaded Photos</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {fileUploads.map((file, index) => (
                      <div key={index} className="relative group">
                        <div 
                          className="h-32 border rounded-md flex items-center justify-center bg-muted/20 cursor-pointer overflow-hidden"
                          onClick={() => handlePreviewImage(file)}
                        >
                          {file.type.startsWith('image/') ? (
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={file.name} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-sm p-2">
                              <File className="h-8 w-8 text-muted-foreground mb-1" />
                              <span className="text-xs truncate w-full text-center">{file.name}</span>
                            </div>
                          )}
                        </div>
                        <button 
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <span className="text-xs">×</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleAddCompetitor}>
                  <Plus className="h-4 w-4 mr-2" /> Add Competitor
                </Button>
              </div>

              {/* Competitor List */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Added Competitors</h3>
                {competitors.length === 0 ? (
                  <div className="border rounded-md p-6 text-center text-muted-foreground">
                    No competitor products added yet. Fill out the form above to add one.
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Brand</TableHead>
                          <TableHead>Product Description</TableHead>
                          <TableHead>Promotional Price</TableHead>
                          <TableHead>Images</TableHead>
                          <TableHead className="w-10">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {competitors.map((competitor) => (
                          <TableRow key={competitor.id}>
                            <TableCell className="font-medium">{competitor.brand}</TableCell>
                            <TableCell>{competitor.productDescription}</TableCell>
                            <TableCell>
                              {competitor.promotionalPrice 
                                ? formatCurrency(competitor.promotionalPrice) 
                                : "Not specified"}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleViewCompetitorImages(competitor.pictures)}
                                disabled={competitor.pictures.length === 0}
                              >
                                View {competitor.pictures.length} {competitor.pictures.length === 1 ? "image" : "images"}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleRemoveCompetitor(competitor.id)}
                                className="text-destructive hover:text-destructive/90"
                              >
                                <span className="sr-only">Remove</span>
                                <span className="text-lg">×</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Competitor Report Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Total Competitors</span>
                  <span className="text-xl font-bold">{competitors.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Store</span>
                  <span className="text-md font-medium">
                    {selectedStore ? stores?.find(s => s.id.toString() === selectedStore)?.name : 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Competitors with Price</span>
                  <span className="text-md font-medium">
                    {competitors.filter(c => c.promotionalPrice !== null).length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Total Images</span>
                  <span className="text-md font-medium">
                    {competitors.reduce((total, curr) => total + curr.pictures.length, 0)}
                  </span>
                </div>
              </div>

              <div className="bg-muted/20 p-4 rounded-md">
                <h4 className="font-medium mb-2">Reported Brands</h4>
                <ul className="space-y-1 list-disc list-inside text-sm">
                  {competitors.length > 0 ? (
                    competitors.map((c, idx) => (
                      <li key={idx} className="text-muted-foreground">
                        {c.brand}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">
                      No competitors added yet
                    </li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewDialogOpen} onOpenChange={setImagePreviewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="overflow-hidden rounded-md">
              <img 
                src={selectedImage} 
                alt="Preview" 
                className="w-full h-auto"
                onLoad={() => URL.revokeObjectURL(selectedImage)}
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
    </div>
  );
};

export default CompetitorMerchandisingPage;