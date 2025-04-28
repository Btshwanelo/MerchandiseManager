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
import { Loader2, Plus, Upload, Store, Camera, Save, File, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Product, Store as StoreType, StockLocation } from "@shared/schema";

const StockTakePage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [stockTakeItems, setStockTakeItems] = useState<Array<{productId: number, quantity: number, location: StockLocation}>>([]);
  const [fileUploads, setFileUploads] = useState<File[]>([]);
  const [imagePreviewDialogOpen, setImagePreviewDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedQuantity, setSelectedQuantity] = useState<string>("0");
  const [selectedLocation, setSelectedLocation] = useState<StockLocation>(StockLocation.SHELF);
  const [stockTakeSummary, setStockTakeSummary] = useState({
    totalProducts: 0,
    inStock: 0,
    outOfStock: 0,
    lowStock: 0,
  });

  // Fetch stores
  const { data: stores, isLoading: isLoadingStores } = useQuery<StoreType[]>({
    queryKey: ["/api/stores"],
  });

  // Fetch products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Add item to stock take
  const handleAddItem = () => {
    if (!selectedProduct || selectedProduct === "") {
      toast({
        title: "Select a product",
        description: "Please select a product from the dropdown menu.",
        variant: "destructive"
      });
      return;
    }

    const productId = parseInt(selectedProduct);
    const quantity = parseInt(selectedQuantity);
    const location = selectedLocation;
    
    // Check if product already exists in the list
    const existingItemIndex = stockTakeItems.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...stockTakeItems];
      updatedItems[existingItemIndex].quantity = quantity;
      updatedItems[existingItemIndex].location = location;
      setStockTakeItems(updatedItems);
    } else {
      // Add new item
      setStockTakeItems([...stockTakeItems, { productId, quantity, location }]);
    }
    
    // Reset selection
    setSelectedProduct("");
    setSelectedQuantity("0");
    
    // Update summary
    updateSummary([...stockTakeItems, { productId, quantity, location }]);
  };

  // Update the summary stats
  const updateSummary = (items: Array<{productId: number, quantity: number, location: StockLocation}>) => {
    if (!products) return;
    
    const totalProducts = items.length;
    const inStock = items.filter(item => item.quantity > 0).length;
    const outOfStock = items.filter(item => item.quantity === 0).length;
    
    const lowStock = items.filter(item => {
      const product = products.find(p => p.id === item.productId);
      return product && item.quantity > 0 && item.quantity < product.minStockLevel;
    }).length;
    
    setStockTakeSummary({
      totalProducts,
      inStock,
      outOfStock,
      lowStock
    });
  };

  // Remove item from stock take
  const handleRemoveItem = (index: number) => {
    const updatedItems = stockTakeItems.filter((_, i) => i !== index);
    setStockTakeItems(updatedItems);
    updateSummary(updatedItems);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Maximum 5 images
      const newFiles = Array.from(e.target.files);
      
      if (fileUploads.length + newFiles.length > 5) {
        toast({
          title: "Too many images",
          description: "You can upload a maximum of 5 shelf pictures.",
          variant: "destructive"
        });
        return;
      }
      
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

  // Create stock take mutation
  const createStockTakeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/stock-takes", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-takes"] });
      toast({
        title: "Stock take submitted",
        description: "The stock take has been successfully submitted.",
      });
      // Reset form
      setSelectedStore("");
      setComment("");
      setStockTakeItems([]);
      setFileUploads([]);
      setStockTakeSummary({
        totalProducts: 0,
        inStock: 0,
        outOfStock: 0,
        lowStock: 0,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to submit stock take",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit stock take
  const handleSubmit = async () => {
    if (!selectedStore) {
      toast({
        title: "Store required",
        description: "Please select a store for this stock take.",
        variant: "destructive"
      });
      return;
    }

    if (stockTakeItems.length === 0) {
      toast({
        title: "No items added",
        description: "Please add at least one product to the stock take.",
        variant: "destructive"
      });
      return;
    }

    // In a real implementation, we would upload the images to a storage service
    // and then submit the form data with the image URLs
    // For this prototype, we're just simulating the process

    const formData = new FormData();
    formData.append("storeId", selectedStore);
    formData.append("comment", comment);
    formData.append("items", JSON.stringify(stockTakeItems));
    
    fileUploads.forEach(file => {
      formData.append("pictures", file);
    });

    createStockTakeMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stock Take / Availability</h1>
        <Button 
          onClick={handleSubmit}
          disabled={createStockTakeMutation.isPending}
        >
          {createStockTakeMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Submit Stock Take
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Comments</label>
                <Textarea 
                  placeholder="Add any comments about this stock take..." 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Product Availability</CardTitle>
              <div className="space-x-2">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md flex items-center text-sm">
                    <Camera className="h-4 w-4 mr-2" />
                    {fileUploads.length > 0 ? `${fileUploads.length} of 5 Photos` : "Add Shelf Photos"}
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
              {/* Add Product Section */}
              <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Product</label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingProducts ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading products...
                        </div>
                      ) : (
                        products?.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} - {product.sku}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-32 space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input 
                    type="number" 
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="w-full sm:w-40 space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Select 
                    value={selectedLocation} 
                    onValueChange={(value) => setSelectedLocation(value as StockLocation)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={StockLocation.SHELF}>Shelf</SelectItem>
                      <SelectItem value={StockLocation.BACK_STORE}>Back Store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddItem} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </div>

              {/* Uploaded Files */}
              {fileUploads.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Uploaded Photos</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {fileUploads.map((file, index) => (
                      <div key={index} className="relative group">
                        <div 
                          className="h-24 border rounded-md flex items-center justify-center bg-muted/20 cursor-pointer"
                          onClick={() => handlePreviewImage(file)}
                        >
                          <div className="flex flex-col items-center text-sm p-2">
                            <File className="h-8 w-8 text-muted-foreground mb-1" />
                            <span className="text-xs truncate w-full text-center">{file.name}</span>
                          </div>
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

              {/* Product List */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Added Products</h3>
                {stockTakeItems.length === 0 ? (
                  <div className="border rounded-md p-6 text-center text-muted-foreground">
                    No products added yet. Select a product and quantity to add it to the stock take.
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-10">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockTakeItems.map((item, index) => {
                          const product = products?.find(p => p.id === item.productId);
                          if (!product) return null;
                          
                          // Determine status
                          let status = { label: "In Stock", color: "text-success" };
                          if (item.quantity === 0) {
                            status = { label: "Out of Stock", color: "text-destructive" };
                          } else if (item.quantity < product.minStockLevel) {
                            status = { label: "Low Stock", color: "text-warning" };
                          }
                          
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{product.sku}</TableCell>
                              <TableCell>{product.category}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell className={status.color}>{status.label}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-destructive hover:text-destructive/90"
                                >
                                  <span className="sr-only">Remove</span>
                                  <span className="text-lg">×</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
              <CardTitle>Stock Take Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Total Products</span>
                  <span className="text-xl font-bold">{stockTakeSummary.totalProducts}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">In Stock</span>
                  <span className="text-xl font-bold text-success">{stockTakeSummary.inStock}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Out of Stock</span>
                  <span className="text-xl font-bold text-destructive">{stockTakeSummary.outOfStock}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Low Stock</span>
                  <span className="text-xl font-bold text-warning">{stockTakeSummary.lowStock}</span>
                </div>
              </div>

              <div className="bg-muted/20 p-4 rounded-md">
                <h4 className="font-medium mb-2">Report Status</h4>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span className="bg-primary/20 text-primary rounded-full w-4 h-4 flex items-center justify-center mr-2">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  Store selected: {selectedStore ? "Yes" : "No"}
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <span className="bg-primary/20 text-primary rounded-full w-4 h-4 flex items-center justify-center mr-2">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  Products added: {stockTakeItems.length > 0 ? "Yes" : "No"}
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <span className="bg-primary/20 text-primary rounded-full w-4 h-4 flex items-center justify-center mr-2">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  Shelf photos: {fileUploads.length} of 5
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewDialogOpen} onOpenChange={setImagePreviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
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

export default StockTakePage;