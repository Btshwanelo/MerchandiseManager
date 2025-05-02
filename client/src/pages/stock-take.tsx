import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Scan,
  Eye,
  X,
  Edit,
  CheckCircle,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Product, Store as StoreType, StockLocation, UserRole, StockTake as DbStockTake } from "@shared/schema";
// Removed barcode scanner import

// Define a type for StockTake that includes properties we know will be in our response
type StockTake = DbStockTake & {
  pictures: string[];
  user?: {
    id: number;
    name: string;
    username: string;
  };
  items?: {
    id: number;
    productId: number;
    quantity: number;
    location: StockLocation;
    product?: Product;
  }[];
};

interface StockTakePageProps {
  storeId?: string;
}

const StockTakePage = ({ storeId }: StockTakePageProps = {}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStore, setSelectedStore] = useState<string>(storeId || "");
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
  
  // Selected stock takes for bulk actions (admin)
  const [selectedStockTakes, setSelectedStockTakes] = useState<number[]>([]);

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
  
  // Update the selected store when storeId prop changes or stores are loaded
  useEffect(() => {
    if (storeId && storeId !== selectedStore) {
      setSelectedStore(storeId);
      
      // Show a toast notification to indicate we're working with this store
      if (stores) {
        const store = stores.find(s => s.id.toString() === storeId);
        if (store) {
          toast({
            title: "Store selected",
            description: `You are now working on stock take for ${store.name}`,
          });
        }
      }
    }
  }, [storeId, stores, selectedStore, toast]);

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
        // Debug log what's in the FormData
        console.log("Stock take submission - FormData contents:", {
          storeId: formData.get('storeId'),
          hasItems: !!formData.get('items'),
          itemsLength: formData.get('items') ? JSON.parse(formData.get('items') as string).length : 0,
          filesCount: Array.from(formData.getAll('pictures')).length
        });
        
        // Use fetch directly instead of apiRequest to have more control
        const res = await fetch("/api/stock-takes", {
          method: "POST",
          body: formData,
          credentials: "include"
        });
        
        if (!res.ok) {
          let errorMessage = "Failed to submit stock take";
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If response is not JSON, try to get text
            const errorText = await res.text().catch(() => "");
            if (errorText) errorMessage = errorText;
          }
          throw new Error(errorMessage);
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
  
  // Toggle select all stock takes
  const toggleSelectAll = () => {
    if (selectedStockTakes.length === (completedStockTakes?.length || 0)) {
      // If all are selected, unselect all
      setSelectedStockTakes([]);
    } else {
      // Otherwise, select all
      setSelectedStockTakes(completedStockTakes?.map(st => st.id) || []);
    }
  };
  
  // Toggle selection of a single stock take
  const toggleSelectStockTake = (id: number) => {
    if (selectedStockTakes.includes(id)) {
      setSelectedStockTakes(selectedStockTakes.filter(stId => stId !== id));
    } else {
      setSelectedStockTakes([...selectedStockTakes, id]);
    }
  };

  // Different view based on user role
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stock Take / Availability</h1>
        {!isAdmin && (
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
        )}
        {isAdmin && (
          <div className="flex space-x-2">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Stock Take
            </Button>
          </div>
        )}
      </div>

      {/* Admin View - Table with Bulk Actions */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Stock Takes</CardTitle>
              <div className="flex items-center space-x-2">
                <Input 
                  placeholder="Search stock takes..." 
                  className="w-[250px]"
                />
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStockTakes ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !completedStockTakes || completedStockTakes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No stock takes found.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="select-all" 
                      checked={selectedStockTakes.length === completedStockTakes.length && completedStockTakes.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm">Select All</label>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={selectedStockTakes.length === 0}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Processed
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={selectedStockTakes.length === 0}
                    >
                      <File className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 hover:text-red-500" 
                      disabled={selectedStockTakes.length === 0}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Merchandiser</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Last Edited</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedStockTakes.map((stockTake) => {
                        const stockTakeStore = stores?.find(store => store.id === stockTake.storeId);
                        return (
                          <TableRow key={stockTake.id}>
                            <TableCell>
                              <Checkbox 
                                id={`select-${stockTake.id}`} 
                                checked={selectedStockTakes.includes(stockTake.id)}
                                onCheckedChange={() => toggleSelectStockTake(stockTake.id)}
                              />
                            </TableCell>
                            <TableCell>{new Date(stockTake.date || '').toLocaleDateString()}</TableCell>
                            <TableCell>{stockTakeStore?.name || `Store #${stockTake.storeId}`}</TableCell>
                            <TableCell>{stockTake.user?.name || stockTake.userId}</TableCell>
                            <TableCell>
                              <Badge variant={stockTake.status === 'completed' ? 'default' : 'outline'} className="capitalize">
                                {stockTake.status || 'unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {typeof stockTake.items?.length === 'number' ? stockTake.items.length : '—'}
                            </TableCell>
                            <TableCell>
                              {stockTake.lastEditedAt ? new Date(stockTake.lastEditedAt).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setLocation(`/stock-take-detail/${stockTake.id}`, { 
                                    replace: false,
                                    state: { 
                                      stockTake: {
                                        id: stockTake.id,
                                        user: stockTake.user,
                                        storeId: stockTake.storeId,
                                        items: stockTake.items,
                                        date: stockTake.date,
                                        status: stockTake.status,
                                        pictures: stockTake.pictures,
                                        comment: stockTake.comment,
                                        lastEditedAt: stockTake.lastEditedAt,
                                        lastEditedBy: stockTake.lastEditedBy,
                                        auditComment: stockTake.auditComment
                                      }
                                    }
                                  })}
                                >
                                  <File className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-red-500 hover:text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 mt-4">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Merchandiser View - Form to submit stock take */}
      {!isAdmin && (
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
                  <label className="text-sm font-medium">Default Location</label>
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
                  <p className="text-xs text-muted-foreground">This is the default location for all products in this stock take</p>
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
              <CardHeader>
                <CardTitle>Product Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-2 block">Product</label>
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
                              <div className="flex items-center">
                                <ShoppingCart className="h-4 w-4 mr-2 text-muted-foreground" />
                                {product.name} - {product.sku}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Quantity</label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={selectedQuantity}
                        onChange={(e) => setSelectedQuantity(e.target.value)}
                        min={0}
                      />
                      <Button onClick={handleAddItem}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {stockTakeItems.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockTakeItems.map((item, index) => {
                          const product = products?.find(p => p.id === item.productId);
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {product?.name || `Product #${item.productId}`}
                              </TableCell>
                              <TableCell>{product?.sku || '-'}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={item.quantity === 0 ? "destructive" : (item.quantity < (product?.minStockLevel || 5) ? "warning" : "default")}>
                                  {item.quantity}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {item.location.toLowerCase().replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {stockTakeItems.length === 0 && (
                  <div className="border rounded-md p-8 text-center text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Products Added</h3>
                    <p>Add products to your stock take using the form above.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Shelf Pictures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Upload up to 5 pictures of your shelf display</p>
                  <label htmlFor="picture-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90">
                      <Camera className="h-4 w-4" />
                      <span>Add Photos</span>
                    </div>
                    <input
                      id="picture-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
                
                {fileUploads.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {fileUploads.map((file, index) => (
                      <div key={index} className="relative group border rounded-md overflow-hidden">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Shelf picture ${index + 1}`} 
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center space-x-2">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handlePreviewImage(file)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleRemoveFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed rounded-md p-8 text-center text-muted-foreground">
                    <Camera className="h-10 w-10 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Pictures Added</h3>
                    <p>Add pictures of your shelf displays to help with inventory tracking.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Stock Take Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Total Products</span>
                  <span className="text-xl font-bold">{stockTakeSummary.totalProducts}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">In Stock</span>
                  <span className="text-xl font-bold">{stockTakeSummary.inStock}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Out of Stock</span>
                  <span className="text-xl font-bold text-destructive">{stockTakeSummary.outOfStock}</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium">Low Stock</span>
                  <span className="text-xl font-bold text-warning">{stockTakeSummary.lowStock}</span>
                </div>
                
                <div className="mt-6 space-y-4">
                  <h3 className="font-medium">Report Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className={selectedStore ? "text-green-500" : "text-muted-foreground"}>
                        {selectedStore ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      </div>
                      <span className="text-sm">Store selected: {selectedStore ? "Yes" : "No"}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <div className={stockTakeItems.length > 0 ? "text-green-500" : "text-muted-foreground"}>
                        {stockTakeItems.length > 0 ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      </div>
                      <span className="text-sm">Products added: {stockTakeItems.length > 0 ? "Yes" : "No"}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <div className={fileUploads.length > 0 ? "text-green-500" : "text-muted-foreground"}>
                        {fileUploads.length > 0 ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      </div>
                      <span className="text-sm">Shelf photos: {fileUploads.length} of 5</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full"
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
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Recently Completed Stock Takes - Only visible to merchandisers */}
      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Completed Stock Takes</CardTitle>
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
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-0 h-auto" 
                              onClick={() => setLocation(`/stock-take-detail/${stockTake.id}`, { 
                                replace: false,
                                state: { 
                                  stockTake: {
                                    id: stockTake.id,
                                    user: stockTake.user,
                                    storeId: stockTake.storeId,
                                    items: stockTake.items,
                                    date: stockTake.date,
                                    status: stockTake.status,
                                    pictures: stockTake.pictures,
                                    comment: stockTake.comment,
                                    lastEditedAt: stockTake.lastEditedAt,
                                    lastEditedBy: stockTake.lastEditedBy,
                                    auditComment: stockTake.auditComment
                                  }
                                }
                              })}
                            >
                              View Items
                            </Button>
                          </TableCell>
                          <TableCell className="hidden md:table-cell truncate max-w-[200px]">
                            {stockTake.comment || '-'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {stockTake.pictures && stockTake.pictures.length > 0 ? (
                              <Badge variant="outline">{stockTake.pictures.length} photos</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setLocation(`/stock-take-detail/${stockTake.id}`, { 
                                replace: false,
                                state: { 
                                  stockTake: {
                                    id: stockTake.id,
                                    user: stockTake.user,
                                    storeId: stockTake.storeId,
                                    items: stockTake.items,
                                    date: stockTake.date,
                                    status: stockTake.status,
                                    pictures: stockTake.pictures,
                                    comment: stockTake.comment,
                                    lastEditedAt: stockTake.lastEditedAt,
                                    lastEditedBy: stockTake.lastEditedBy,
                                    auditComment: stockTake.auditComment
                                  }
                                }
                              })}
                            >
                              <File className="h-4 w-4 mr-2" />
                              Details
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
      )}

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewDialogOpen} onOpenChange={setImagePreviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="flex justify-center">
              <img
                src={selectedImage}
                alt="Preview"
                className="max-h-[80vh] max-w-full object-contain"
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

      {/* Barcode scanner has been removed */}

      {/* Low Stock Dialog */}
      <Dialog open={showLowStockDialog} onOpenChange={setShowLowStockDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Low Stock Items Detected</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Some items have low stock levels. Please review the following:
            </p>
            <div className="space-y-2">
              {lowStockItems.map((item, index) => (
                <div key={index} className="border rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{item.product.name}</span>
                    <Badge variant="warning">{item.quantity} in stock</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground my-1">
                    Location: {item.location.toLowerCase().replace('_', ' ')}
                  </p>
                  {item.needsOrder && (
                    <p className="text-red-500 text-sm mt-1">
                      <AlertTriangle className="h-3 w-3 inline-block mr-1" />
                      Reorder needed (below minimum of {item.product.minStockLevel})
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-4">
            <Button 
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                // Create line items in the order for low stock items
                const orderItems = lowStockItems
                  .filter(item => item.needsOrder)
                  .map(item => ({
                    productId: item.product.id,
                    quantity: Math.max(item.product.minStockLevel - item.quantity, 1), // Order enough to meet minimum
                    location: item.location,
                    price: item.product.price
                  }));
                  
                // In a real implementation, we would send these to the API
                console.log("Creating order items:", orderItems);
                
                // Simulate API call for order creation
                // In a production app, this would be a real API call:
                // apiRequest("POST", "/api/orders", { items: orderItems, storeId: selectedStore })
                
                toast({
                  title: "Orders Placed",
                  description: `${lowStockItems.filter(i => i.needsOrder).length} orders have been placed for low stock items.`
                });
                setShowLowStockDialog(false);
                submitStockTake();
              }}
            >
              Place Orders & Submit
            </Button>
            <Button 
              className="w-full sm:w-auto"
              onClick={() => {
                setShowLowStockDialog(false);
                submitStockTake();
              }}
            >
              Submit Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTakePage;