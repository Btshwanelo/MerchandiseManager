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
import { 
  Loader2, 
  Plus, 
  Upload, 
  Store, 
  Camera, 
  Save, 
  File, 
  CheckCircle2, 
  AlertTriangle, 
  ShoppingCart, 
  RefreshCw, 
  QrCode,
  Scan
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Product, Store as StoreType, StockLocation, UserRole, StockTake as DbStockTake } from "@shared/schema";

// Define a type for StockTake that includes properties we know will be in our response
type StockTake = DbStockTake & {
  pictures: string[]
};
import { BarcodeScanner } from "@/components/barcode-scanner";

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
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
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
  
  // Fetch completed stock takes
  const { data: completedStockTakes, isLoading: isLoadingStockTakes } = useQuery<StockTake[]>({
    queryKey: ["/api/stock-takes"],
    enabled: !!user,
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
      try {
        const res = await apiRequest("POST", "/api/stock-takes", formData, {
          // Don't set Content-Type header manually - browser will set it with boundary
          // for multipart/form-data
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: "Server error" }));
          throw new Error(errorData.message || "Failed to submit stock take");
        }
        
        return await res.json();
      } catch (error) {
        console.error("Stock take submission error:", error);
        throw error;
      }
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

  // Process items with low quantities and show replenishment prompts
  const [showLowStockDialog, setShowLowStockDialog] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<Array<{
    product: Product,
    quantity: number,
    location: StockLocation,
    needsOrder: boolean
  }>>([]);

  // Check if items need replenishment or ordering
  const checkLowStockItems = () => {
    if (!products) return [];
    
    const lowItems = stockTakeItems
      .filter(item => {
        const product = products.find(p => p.id === item.productId);
        return product && item.quantity < product.minStockLevel;
      })
      .map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return null;
        
        // Determine if an order is needed based on location
        let needsOrder = false;
        
        if (item.location === StockLocation.BACK_STORE && item.quantity < 5) {
          // If back store stock is low, place an order
          needsOrder = true;
        } else if (item.location === StockLocation.SHELF && item.quantity < 5) {
          // For shelf items, check if back store has stock
          // For this implementation, we'll assume we need to check manually
          // In a real system, this would check the back store inventory
          needsOrder = true;
        }
        
        return {
          product,
          quantity: item.quantity,
          location: item.location,
          needsOrder
        };
      })
      .filter(Boolean) as Array<{
        product: Product,
        quantity: number,
        location: StockLocation,
        needsOrder: boolean
      }>;
      
    return lowItems;
  };

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

    // Check for items with low stock levels
    const lowItems = checkLowStockItems();
    
    if (lowItems.length > 0) {
      setLowStockItems(lowItems);
      setShowLowStockDialog(true);
      return;
    }

    // If no low stock items, proceed with submission
    submitStockTake();
  };
  
  // Final submission after checking low stock
  const submitStockTake = () => {
    // In a real implementation, we would upload the images to a storage service
    // and then submit the form data with the image URLs
    // For this prototype, we're just simulating the process

    if (!selectedStore) {
      toast({
        title: "Error submitting stock take",
        description: "Store ID is required. Please select a store.",
        variant: "destructive"
      });
      return;
    }
    
    // Create form data with all required fields
    const formData = new FormData();
    formData.append("storeId", selectedStore);
    formData.append("comment", comment || '');
    
    // Format items to ensure they match the expected format
    const formattedItems = stockTakeItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      location: item.location
    }));
    
    formData.append("items", JSON.stringify(formattedItems));
    
    // Add images if any
    fileUploads.forEach(file => {
      formData.append("pictures", file);
    });

    // Debug output to see what's being sent
    console.log("Submitting stock take: ", {
      storeId: selectedStore,
      itemsCount: formattedItems.length
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
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-2">
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Product</label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsScannerOpen(true)}
                      className="flex items-center gap-1 h-7 text-xs"
                    >
                      <Scan className="h-3 w-3" />
                      Scan Barcode
                    </Button>
                  </div>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="w-full">
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
                
                <div className="w-full md:w-32 space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input 
                    type="number" 
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(e.target.value)}
                    min="0"
                    className="w-full"
                  />
                </div>
                
                <div className="w-full md:w-40 space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Select 
                    value={selectedLocation} 
                    onValueChange={(value) => setSelectedLocation(value as StockLocation)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select location..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={StockLocation.SHELF}>Shelf</SelectItem>
                      <SelectItem value={StockLocation.BACK_STORE}>Back Store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={handleAddItem} className="w-full md:w-auto">
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
                          <TableHead className="hidden md:table-cell">SKU</TableHead>
                          <TableHead className="hidden md:table-cell">Category</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="hidden sm:table-cell">Status</TableHead>
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
                              <TableCell className="font-medium">
                                <div>{product.name}</div>
                                <div className="md:hidden text-xs text-muted-foreground mt-1">
                                  SKU: {product.sku}
                                </div>
                                <div className="md:hidden text-xs text-muted-foreground">
                                  {product.category}
                                </div>
                                <div className="sm:hidden text-xs mt-1 flex items-center">
                                  <span className={`${status.color} font-medium`}>{status.label}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">{product.sku}</TableCell>
                              <TableCell className="hidden md:table-cell">{product.category}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{item.location === StockLocation.SHELF ? "Shelf" : "Back Store"}</TableCell>
                              <TableCell className={`hidden sm:table-cell ${status.color}`}>{status.label}</TableCell>
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
      
      {/* Barcode Scanner Dialog */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
          </DialogHeader>
          <BarcodeScanner 
            onScanSuccess={(result) => {
              // Handle successful scan - find product by SKU
              if (products) {
                const product = products.find(p => p.sku === result);
                if (product) {
                  setSelectedProduct(product.id.toString());
                  setIsScannerOpen(false);
                  toast({
                    title: "Product found",
                    description: `Scanned: ${product.name} (${product.sku})`,
                  });
                } else {
                  // Product not found
                  setScannerError(`Product with SKU/barcode ${result} not found`);
                  toast({
                    title: "Product not found",
                    description: `No product matches barcode: ${result}`,
                    variant: "destructive",
                  });
                }
              }
            }}
            onScanError={(error) => {
              setScannerError(error);
            }}
            onClose={() => setIsScannerOpen(false)}
          />
          {scannerError && (
            <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              {scannerError}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Low Stock Alert Dialog */}
      <Dialog open={showLowStockDialog} onOpenChange={setShowLowStockDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-warning flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" /> Low Stock Alert
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The following items have low stock levels and may need replenishment or ordering:
            </p>
            
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Action Needed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div>{item.product.name}</div>
                        <div className="sm:hidden text-xs text-muted-foreground mt-1">
                          {item.location === StockLocation.SHELF ? "Shelf" : "Back Store"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{item.location === StockLocation.SHELF ? "Shelf" : "Back Store"}</TableCell>
                      <TableCell className="text-warning">{item.quantity}</TableCell>
                      <TableCell>
                        {item.needsOrder ? (
                          <span className="text-destructive flex items-center">
                            <ShoppingCart className="h-4 w-4 mr-1" /> Order needed
                          </span>
                        ) : (
                          <span className="text-amber-500 flex items-center">
                            <RefreshCw className="h-4 w-4 mr-1" /> Replenish
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {user?.role === UserRole.MERCHANDISER && lowStockItems.some(item => item.needsOrder) && (
              <div className="bg-muted/30 p-4 rounded-md">
                <h4 className="font-medium text-sm mb-2">Order Recommendation</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Some items need to be ordered based on your stock take. Would you like to create an order now?
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setShowLowStockDialog(false);
                      // In a real app, you'd redirect to the order page with these items pre-populated
                      toast({
                        title: "Order creation",
                        description: "Redirecting to order creation page...",
                      });
                      
                      // For now, we'll just submit the stock take
                      submitStockTake();
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" /> Create Order
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowLowStockDialog(false);
                submitStockTake();
              }}
            >
              Submit Without Action
            </Button>
            <DialogClose asChild>
              <Button>Continue Editing</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Completed Stock Takes Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Completed Stock Takes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingStockTakes ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !completedStockTakes || completedStockTakes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No stock takes found. Complete your first stock take above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Items</TableHead>
                    <TableHead className="hidden md:table-cell">Comment</TableHead>
                    <TableHead className="hidden md:table-cell">Pictures</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedStockTakes.map((stockTake) => {
                    const stockTakeStore = stores?.find(store => store.id === stockTake.storeId);
                    return (
                      <TableRow key={stockTake.id}>
                        <TableCell>{new Date(stockTake.date || '').toLocaleDateString()}</TableCell>
                        <TableCell>{stockTakeStore?.name || `Store #${stockTake.storeId}`}</TableCell>
                        <TableCell>
                          <span className={
                            stockTake.status === 'completed' 
                              ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800' 
                              : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'
                          }>
                            {stockTake.status}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {/* We don't have the count directly, this will be fetched when viewing details */}
                          <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => {
                            // View details logic would go here
                            toast({
                              title: "Feature Coming Soon",
                              description: "Stock take details view will be available in a future update.",
                            });
                          }}>
                            View Items
                          </Button>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {stockTake.comment && stockTake.comment.length > 0 
                            ? (stockTake.comment.length > 20 
                                ? `${stockTake.comment.substring(0, 20)}...` 
                                : stockTake.comment) 
                            : '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {stockTake.pictures && stockTake.pictures.length > 0 ? (
                            <span className="text-sm">{stockTake.pictures.length} photos</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => {
                            // View details logic would go here
                            toast({
                              title: "Feature Coming Soon",
                              description: "Stock take details view will be available in a future update.",
                            });
                          }}>
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockTakePage;