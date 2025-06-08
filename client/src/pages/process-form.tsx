import React, { useState, useEffect, useCallback } from "react";

// Helper function to truncate product names to prevent UI expansion
const truncateProductName = (name: string, maxLength = 25) => {
  return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
};
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Product, 
  WorkItemStatus, 
  WorkItemType,
  StockTakeType, 
  Inventory
} from "@shared/schema";

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, ClipboardList, ShoppingCart, BarChart, Tag, CheckCircle, 
  CheckCircle2, AlertCircle, AlertTriangle, Plus, Camera, QrCode, 
  ShoppingBasket, Trash, TrendingUp, Check, ChevronRight, RotateCcw,
  Package, ArrowRight, Image as ImageIcon, Maximize2, Upload, X, Clock
} from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkItemAccessError } from "@/components/ui/error-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";

// Hooks and Utilities
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Type declarations for component props
type StockTakeSectionProps = {
  storeId: number;
  workItemId: number;
  navigate: (to: string) => void;
  setActiveStep: (step: string) => void;
  setLowStockItems?: (items: Array<{product: Product, quantity: number, location: string}>) => void;
  setShowLowStockAlert?: (show: boolean) => void;
  workItem?: WorkItem; // Add workItem prop to check completion status
};

type MerchandisingSectionProps = {
  storeId: number;
  workItemId: number;
  navigate: (to: string) => void;
  setActiveStep: (step: string) => void;
};

type CompetitorAnalysisSectionProps = {
  storeId: number;
  workItemId: number;
  navigate: (to: string) => void;
  setActiveStep: (step: string) => void;
};

type OrderPlacementSectionProps = {
  storeId: number;
  workItemId: number;
  navigate: (to: string) => void;
  setActiveStep: (step: string) => void;
  lowStockItems?: Array<{product: Product, quantity: number, location: string}>;
};

// Interfaces matching schema.ts
interface PromotionItem {
  productId: number;
  price: number;
  notes?: string;
}

interface StockTakeDataItem {
  id: number;
  stockTakeId: number;
  productId: number;
  quantity: number;
  location: string;
  product?: Product;
}

interface StockTakeData {
  id: number;
  storeId: number;
  userId: number;
  date: string | null;
  comment: string | null;
  pictures: string[] | null;
  status: string;
  lastEditedBy: number | null;
  lastEditedAt: string | null;
  auditComment: string | null;
  items?: StockTakeDataItem[];
}

interface MerchandisingItem {
  product?: Product;
  price: number;
  notes?: string;
}

interface MerchandisingData {
  id?: number;
  storeId?: number;
  workItemId?: number;
  userId?: number;
  createdAt?: string;
  comment?: string;
  promotionPictures?: string[];
  items?: MerchandisingItem[];
}

interface CompetitorItem {
  productName: string;
  brand: string;
  price: number;
  notes?: string;
}

interface CompetitorData {
  id?: number;
  storeId?: number;
  workItemId?: number;
  userId?: number;
  competitorName?: string;
  createdAt?: string;
  generalNotes?: string;
  pictures?: string[];
  items?: CompetitorItem[];
}

interface OrderItem {
  product?: Product;
  quantity: number;
}

interface OrderData {
  id?: number;
  storeId?: number;
  workItemId?: number;
  userId?: number;
  orderDate?: string;
  status?: string;
  notes?: string;
  items?: OrderItem[];
}

interface AuditEntry {
  id: number;
  userId: number;
  action: string;
  details: string;
  timestamp: string;
  user?: {
    id: number;
    name: string;
    username: string;
  };
}

interface WorkItem {
  id: number;
  title: string;
  description?: string;
  type: string;
  userId: number;
  storeId: number;
  storeAssignmentId: number;
  dueDate: string;
  priority: string;
  status: string;
  completedAt?: string;
  notes?: string;
  attachments?: string[];
  draftData?: string;
  currentStep?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// Using custom interfaces to match schema

interface StoreAssignment {
  id: number;
  userId: number;
  storeId: number;
  assignedBy: number;
  startDate: string;
  endDate?: string;
  status: string;
  stockTakeType: string;
  createdAt: string;
}

// Component for Stock Take section
const StockTakeSection = ({ storeId, workItemId, navigate, setActiveStep, setLowStockItems, setShowLowStockAlert, workItem }: StockTakeSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<{productId: number, quantity: number, location: string}[]>([]);
  const [pictures, setPictures] = useState<Array<File | string>>([]);
  // Add state for individual image uploads (8 placeholders) - can be either File objects or strings
  const [shelfImages, setShelfImages] = useState<Array<File | string | null>>(Array(8).fill(null));
  const [comments, setComments] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<string>("0");
  const [stockTakeStatus, setStockTakeStatus] = useState<string>("draft");
  const { toast } = useToast();

  // Save draft mutation - saves actual stock take data to database
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      // Format stock data to match server expectations
      const formattedItems = stockData.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        location: item.location
      }));

      // Create FormData to match the server's expectation
      const formData = new FormData();
      formData.append('storeId', storeId.toString());
      formData.append('workItemId', workItemId.toString());
      formData.append('items', JSON.stringify(formattedItems));
      formData.append('comment', comments || '');
      formData.append('status', 'draft');

      // Add existing picture paths
      const picturePaths = pictures.filter(p => typeof p === 'string');
      if (picturePaths.length > 0) {
        formData.append('pictures', JSON.stringify(picturePaths));
      }

      const response = await fetch("/api/stock-takes", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!response.ok) {
        let errorMessage = "Failed to save draft";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text().catch(() => "");
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/stock-takes/by-work-item', workItemId] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
      
      toast({
        title: "Draft saved",
        description: "Your progress has been saved and you can resume later.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Listen for save draft events and capture current form state
  useEffect(() => {
    const handleSaveDraft = (event: CustomEvent) => {
      const { activeStep } = event.detail;
      
      if (activeStep === 'stock-take') {
        // Check if we have any data to save
        if (stockData.length > 0 || comments.trim() || pictures.length > 0) {
          saveDraftMutation.mutate();
        } else {
          toast({
            title: "Nothing to save",
            description: "Add some stock items, comments, or pictures before saving.",
            variant: "destructive"
          });
        }
      }
    };

    window.addEventListener('saveDraft', handleSaveDraft as EventListener);
    
    return () => {
      window.removeEventListener('saveDraft', handleSaveDraft as EventListener);
    };
  }, [stockData, comments, pictures, saveDraftMutation, toast]);
  
  // Flag to indicate if we're in read-only mode (completed work item)
  const isReadOnly = workItem?.status === WorkItemStatus.COMPLETED;
  
  // Get current authenticated user
  const { user } = useAuth();
  
  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!storeId,
  });
  
  // Fetch existing stock take for this store and work item
  const { data: stockTake, isLoading: isLoadingStockTake } = useQuery<StockTakeData>({
    queryKey: [`/api/stock-takes/by-work-item/${workItemId}`],
    enabled: !!workItemId && !!storeId,
  });
  
  // Fetch merchandising data if available
  const { data: merchandisingData } = useQuery<MerchandisingData>({
    queryKey: [`/api/merchandising/by-work-item/${workItemId}`],
    enabled: !!workItemId && isReadOnly,
  });
  
  // Fetch competitor data if available
  const { data: competitorData } = useQuery<CompetitorData>({
    queryKey: [`/api/competitor-merchandising/by-work-item/${workItemId}`],
    enabled: !!workItemId && isReadOnly,
  });
  
  // Fetch order data if available
  const { data: orderData } = useQuery<OrderData>({
    queryKey: [`/api/orders/by-work-item/${workItemId}`],
    enabled: !!workItemId && isReadOnly,
  });
  
  // Fetch audit trail for admin users
  const { data: auditTrail = [] } = useQuery<AuditEntry[]>({
    queryKey: [`/api/work-items/${workItemId}/audit`],
    enabled: !!workItemId && isReadOnly && user?.role === "admin",
  });
  
  // Update state with stock take data when available
  // Restore draft data from existing stock take when available
  useEffect(() => {
    if (stockTake && stockTake.status === 'draft') {
      console.log("Restoring draft stock take data:", stockTake);
      
      // Restore stock take items to stock data format
      if (stockTake.items && stockTake.items.length > 0) {
        const restoredStockData = stockTake.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          location: item.location
        }));
        setStockData(restoredStockData);
        console.log("Restored stock data:", restoredStockData);
      }
      
      // Restore comments
      if (stockTake.comment) {
        setComments(stockTake.comment);
        console.log("Restored comments:", stockTake.comment);
      }
      
      // Restore pictures
      if (stockTake.pictures && stockTake.pictures.length > 0) {
        setPictures(stockTake.pictures);
        console.log("Restored pictures:", stockTake.pictures);
      }
      
      // Set status to draft
      setStockTakeStatus('draft');
      
      toast({
        title: "Draft restored",
        description: "Your previous progress has been restored.",
      });
    }
  }, [stockTake, toast]);

  useEffect(() => {
    if (stockTake) {
      // Update status
      if (stockTake.status) {
        setStockTakeStatus(stockTake.status);
      }
      
      // For completed work items, populate all data from the saved stock take
      if (isReadOnly && stockTake) {
        try {
          // Parse stock take items from stockTake data (using any as a workaround for type issues)
          const anyStockTake = stockTake as any;
          
          if (anyStockTake.items) {
            // Handle both string and array formats
            const parsedItems = typeof anyStockTake.items === 'string' 
              ? JSON.parse(anyStockTake.items) 
              : anyStockTake.items;
              
            if (Array.isArray(parsedItems)) {
              setStockData(parsedItems);
            }
          }
          
          // Set pictures if available
          if (stockTake.pictures) {
            // Handle both array and string formats
            const pics = Array.isArray(stockTake.pictures) 
              ? stockTake.pictures 
              : typeof stockTake.pictures === 'string' 
                ? JSON.parse(stockTake.pictures as string) 
                : [];
            
            setPictures(pics);
            
            // Also populate shelfImages from pictures for the grid display
            const newShelfImages = Array(8).fill(null);
            pics.forEach((pic: string, index: number) => {
              if (index < 8) newShelfImages[index] = pic;
            });
            setShelfImages(newShelfImages);
          }
          
          // Set comments if available
          if (stockTake.comment) {
            setComments(stockTake.comment);
          }
        } catch (e) {
          console.error("Error parsing stock take data:", e);
          toast({
            title: "Data Display Error",
            description: "There was an error parsing the completed stock take data.",
            variant: "destructive"
          });
        }
      }
    }
  }, [stockTake, isReadOnly, toast]);
  
  // Fetch store assignment to get stockTakeType using prop workItem
  const { data: storeAssignment } = useQuery<StoreAssignment>({
    queryKey: ['/api/assignments', workItem?.storeAssignmentId],
    enabled: !!workItem?.storeAssignmentId,
  });
  
  // Determine stock take type from store assignment
  const stockTakeType = storeAssignment?.stockTakeType || 'both';
  
  const submitStockTake = async () => {
    setLoading(true);
    try {
      // Create FormData for proper file upload handling
      const formData = new FormData();
      
      // Add basic stock take data
      formData.append('storeId', storeId.toString());
      formData.append('comment', comments || '');
      formData.append('status', 'submitted');
      formData.append('items', JSON.stringify(stockData));
      if (workItemId) {
        formData.append('workItemId', workItemId.toString());
      }
      
      // Process images - first try to convert file objects directly
      const imagesToProcess = [
        ...shelfImages.filter(Boolean), // Filter out null values
        ...pictures.filter(pic => !shelfImages.includes(pic)) // Add any pictures not in shelfImages
      ];
      
      console.log("Processing images for upload:", {
        shelfImagesCount: shelfImages.filter(Boolean).length,
        picturesCount: pictures.filter(pic => !shelfImages.includes(pic)).length,
        totalImages: imagesToProcess.length
      });
      
      // Add each image to FormData
      for (let i = 0; i < imagesToProcess.length; i++) {
        const image = imagesToProcess[i];
        
        if (image instanceof File) {
          // If it's already a File object, add it directly
          formData.append('pictures', image);
          console.log(`Adding file object to FormData: ${image.name}`);
        } else if (typeof image === 'string') {
          // For legacy string paths, add them as a JSON array
          formData.append('pictures', image);
          console.log(`Adding image path to FormData: ${image}`);
        }
      }
      
      // Use fetch directly for proper FormData handling
      const response = await fetch("/api/stock-takes", {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Stock take submission failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "Stock take submitted",
        description: "Your stock take has been submitted successfully",
      });
      
      // Update local status
      setStockTakeStatus("submitted");
      
      // Check for low stock items
      const lowItems = detectLowStockItems();
      
      // If there are low stock items, update the parent state and show alert
      if (lowItems.length > 0 && setLowStockItems && setShowLowStockAlert) {
        console.log("Low stock items detected:", lowItems);
        setLowStockItems(lowItems);
        setShowLowStockAlert(true);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stores', storeId, 'stock-takes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock-takes/by-work-item', workItemId] });
      
      // Move to the next step in the process form instead of navigating away
      setTimeout(() => {
        // Signal to parent component that this step is complete
        setActiveStep("merchandising");
      }, 1000);
    } catch (error) {
      console.error("Error submitting stock take:", error);
      toast({
        title: "Error",
        description: "Failed to submit stock take",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create FormData for the image upload
        const formData = new FormData();
        formData.append('file', file);
        
        // Upload the file first
        fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        .then(response => response.json())
        .then(data => {
          if (data.filePath) {
            // Add the file path to the pictures array
            setPictures(prev => [...prev, data.filePath]);
            console.log("Image uploaded successfully:", data.filePath);
          } else {
            console.error('Upload failed:', data.error || 'Unknown error');
            toast({
              title: "Image upload failed",
              description: data.error || "Failed to upload image",
              variant: "destructive"
            });
          }
        })
        .catch(error => {
          console.error('Upload error:', error);
          toast({
            title: "Image upload failed",
            description: "An error occurred while uploading the image",
            variant: "destructive"
          });
        });
      }
    }
  };
  
  // Handle individual shelf image upload
  const handleShelfImageUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // We'll store the File object directly and handle it later during form submission
      const newShelfImages = [...shelfImages];
      newShelfImages[index] = file;
      setShelfImages(newShelfImages);
      
      // Also add to the pictures array for backward compatibility
      setPictures(prev => [...prev, file]);
      
      toast({
        title: "Image added",
        description: "Image has been added to your stock take",
      });
      
      console.log(`Image added successfully at index ${index}:`, file.name);
    }
  };
  
  // Handle image removal
  const handleRemoveShelfImage = (index: number) => {
    const newShelfImages = [...shelfImages];
    // Get the image name that's being removed
    const removedImage = newShelfImages[index];
    // Set the slot to null
    newShelfImages[index] = null;
    setShelfImages(newShelfImages);
    
    // Also remove from pictures array if it exists
    if (removedImage) {
      setPictures(prev => prev.filter(pic => pic !== removedImage));
    }
  };
  
  const handleAddProduct = () => {
    if (!selectedProduct) return;
    
    const numQuantity = parseInt(quantity) || 0;
    
    // Determine if we're adding shelf, back store, or both based on stockTakeType
    if (stockTakeType === 'shelf' || stockTakeType === 'both') {
      const newStockData = [...stockData];
      const existingIndex = newStockData.findIndex(
        item => item.productId === selectedProduct.id && item.location === "shelf"
      );
      
      if (existingIndex >= 0) {
        newStockData[existingIndex].quantity = numQuantity;
      } else {
        newStockData.push({
          productId: selectedProduct.id,
          quantity: numQuantity,
          location: "shelf"
        });
      }
      
      setStockData(newStockData);
    }
    
    if (stockTakeType === 'store' || stockTakeType === 'both') {
      // For back store, we only add if it's a store or both type
      const newStockData = [...stockData];
      const existingIndex = newStockData.findIndex(
        item => item.productId === selectedProduct.id && item.location === "back_store"
      );
      
      if (existingIndex >= 0) {
        newStockData[existingIndex].quantity = numQuantity;
      } else {
        newStockData.push({
          productId: selectedProduct.id,
          quantity: numQuantity,
          location: "back_store"
        });
      }
      
      setStockData(newStockData);
    }
    
    // Reset form
    setSelectedProduct(null);
    setQuantity("0");
    
    toast({
      title: "Product added",
      description: `Added ${selectedProduct.name} with quantity ${numQuantity}`,
    });
  };
  
  // Function to get all unique products that have been added
  const getAddedProducts = () => {
    const productIds = new Set<number>();
    stockData.forEach(item => productIds.add(item.productId));
    
    return Array.from(productIds).map(id => {
      const product = products.find(p => p.id === id);
      if (!product) return null;
      
      const shelfItem = stockData.find(item => item.productId === id && item.location === "shelf");
      const backStoreItem = stockData.find(item => item.productId === id && item.location === "back_store");
      
      return {
        product,
        shelfQuantity: shelfItem?.quantity || 0,
        backStoreQuantity: backStoreItem?.quantity || 0
      };
    }).filter(Boolean);
  };
  
  // Function to detect products with low stock (below threshold)
  const detectLowStockItems = () => {
    const lowItems: Array<{product: Product, quantity: number, location: string}> = [];
    
    stockData.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;
      
      // Check if the current quantity is below the minimum stock level threshold
      if (item.quantity < product.minStockLevel) {
        lowItems.push({
          product,
          quantity: item.quantity,
          location: item.location
        });
      }
    });
    
    return lowItems;
  };
  
  // Get products that have been added to the stock take
  const addedProducts = getAddedProducts();
  
  return (
    <div className="space-y-6">
      {/* Status and Stock Take Type Badges */}
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg">
        <div className="flex items-center">
          <span className="font-medium text-muted-foreground mr-2">Status:</span>
          <Badge 
            variant={
              stockTakeStatus === 'completed' ? 'default' :
              stockTakeStatus === 'submitted' ? 'secondary' : 
              'outline'
            } 
            className={`capitalize ${
              stockTakeStatus === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 
              stockTakeStatus === 'submitted' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : 
              'bg-gray-100 text-gray-800 hover:bg-gray-100'
            }`}
          >
            {stockTakeStatus || 'draft'}
          </Badge>
        </div>
        <Badge variant="outline" className="ml-2">
          {stockTakeType === 'shelf' 
            ? 'Shelf Only' 
            : stockTakeType === 'store' 
              ? 'Back Store Only' 
              : 'Shelf & Back Store'}
        </Badge>
      </div>
    
      {/* Product Availability Section */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold">Product Availability</h2>
          {/* Barcode scanner button has been hidden */}
        </div>
        
        <div className="grid md:grid-cols-12 gap-4 mb-6">
          {isReadOnly ? (
            // Read-only mode shows a message instead of the product selector
            <div className="md:col-span-12">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-yellow-800">Completed Stock Take</h3>
                    <p className="text-sm text-yellow-700">
                      This stock take has been completed and cannot be modified. Below is a summary of the recorded inventory.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Normal editable mode with product selector
            <>
              <div className="md:col-span-8">
                <label className="text-base font-medium mb-2 block">Product</label>
                <Combobox
                  value={selectedProduct?.id?.toString() || ""}
                  onChange={(value) => {
                    const product = products.find(p => p.id === parseInt(value));
                    if (product) {
                      setSelectedProduct(product);
                    }
                  }}
                  placeholder="Select a product..."
                  options={
                    products.map((product) => ({
                      label: `${product.name} (${product.sku})`,
                      value: product.id.toString()
                    }))
                  }
                  renderItem={(option: ComboboxOption) => (
                    <div className="flex items-center">
                      <ShoppingCart className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{option.label}</span>
                    </div>
                  )}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="text-base font-medium mb-2 block">Quantity</label>
                <Input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-10"
                />
              </div>
              
              <div className="md:col-span-2 flex items-end">
                <Button 
                  className="w-full h-10"
                  disabled={!selectedProduct} 
                  onClick={handleAddProduct}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add
                </Button>
              </div>
            </>
          )}
        </div>
        
        {/* No Products State */}
        {addedProducts.length === 0 ? (
          <div className="bg-muted/50 rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <ShoppingCart className="h-16 w-16 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium text-muted-foreground mb-2">No Products Added</h3>
            <p className="text-muted-foreground">
              {isReadOnly 
                ? "No products were recorded in this stock take." 
                : "Add products to your stock take using the form above."}
            </p>
          </div>
        ) : (
          <div className={`space-y-4 ${isReadOnly ? 'mt-6' : ''}`}>
            {/* Enhanced read-only header when viewing completed items */}
            {isReadOnly && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Recorded Inventory Items</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Below is a summary of all products counted during this stock take.
                </p>
              </div>
            )}
            
            {/* Product list - enhanced for read-only mode */}
            <div className={isReadOnly ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
              {addedProducts.map(item => (
                <div 
                  key={item?.product.id} 
                  className={`${isReadOnly ? 'bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow' : 'bg-card border'} rounded-lg p-4`}
                >
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base">{item?.product.name}</h3>
                      {isReadOnly && (
                        <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                          #{item?.product.sku}
                        </Badge>
                      )}
                    </div>
                    {!isReadOnly && (
                      <p className="text-sm text-muted-foreground">SKU: {item?.product.sku}</p>
                    )}
                  </div>
                  
                  <div className="grid gap-3">
                    {/* Show shelf quantity if applicable */}
                    {(stockTakeType === 'shelf' || stockTakeType === 'both') && (
                      <div className="flex justify-between items-center p-2 rounded-md bg-gray-50 border border-gray-100">
                        <div className="flex items-center">
                          <Tag className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium">Shelf quantity:</span>
                        </div>
                        <Badge variant={isReadOnly ? "secondary" : "outline"} className={`font-medium ${
                          isReadOnly && item?.shelfQuantity !== undefined && item?.product?.minStockLevel !== undefined && 
                          item.shelfQuantity < item.product.minStockLevel 
                            ? 'bg-red-100 text-red-700 hover:bg-red-100' 
                            : ''
                        }`}>
                          {item?.shelfQuantity}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Show back store quantity if applicable */}
                    {(stockTakeType === 'store' || stockTakeType === 'both') && (
                      <div className="flex justify-between items-center p-2 rounded-md bg-gray-50 border border-gray-100">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-purple-500 mr-2" />
                          <span className="text-sm font-medium">Back store:</span>
                        </div>
                        <Badge variant={isReadOnly ? "secondary" : "outline"} className={`font-medium ${
                          isReadOnly && item?.backStoreQuantity !== undefined && item?.product?.minStockLevel !== undefined && 
                          item.backStoreQuantity < item.product.minStockLevel 
                            ? 'bg-red-100 text-red-700 hover:bg-red-100' 
                            : ''
                        }`}>
                          {item?.backStoreQuantity}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Show min stock level in read-only view */}
                    {isReadOnly && (
                      <div className="flex justify-between items-center p-2 rounded-md bg-yellow-50 border border-yellow-100">
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                          <span className="text-sm font-medium">Min stock level:</span>
                        </div>
                        <Badge variant="outline" className="font-medium bg-yellow-100 text-yellow-700 border-yellow-200">
                          {item?.product.minStockLevel}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Shelf Images Grid and Comments Section */}
      <div className="space-y-6">
        <div className="bg-card border rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold">Shelf Images</h2>
            {isReadOnly && shelfImages.filter(Boolean).length > 0 && (
              <Badge variant="outline" className="bg-muted">
                {shelfImages.filter(Boolean).length} {shelfImages.filter(Boolean).length === 1 ? 'image' : 'images'}
              </Badge>
            )}
          </div>
          
          {isReadOnly ? (
            // Read-only mode for shelf images
            <div>
              {shelfImages.filter(Boolean).length === 0 ? (
                <div className="bg-muted/50 rounded-lg p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <ImageIcon className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium text-muted-foreground mb-2">No Images</h3>
                  <p className="text-muted-foreground">No shelf images were uploaded for this stock take.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {shelfImages.filter(Boolean).map((image, index) => (
                    <div 
                      key={index} 
                      className="group relative aspect-square rounded-md overflow-hidden border hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        // In a real implementation, this would open a modal to preview the image
                        const imageStr = image?.toString() || "";
                        if (user?.role === "admin" && imageStr) {
                          window.open(imageStr, '_blank');
                        }
                        if (imageStr) {
                          toast({
                            title: "Image Preview",
                            description: "Image URL: " + imageStr,
                          });
                        }
                      }}
                    >
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        {image && (typeof image.toString === 'function') ? (
                          (() => {
                            const imageStr = image.toString();
                            return imageStr.includes('.jpg') || imageStr.includes('.png') || imageStr.includes('.jpeg') ? (
                              <div className="relative w-full h-full">
                                <span className="absolute inset-0 bg-gray-200 animate-pulse"></span>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-center px-2 text-muted-foreground">
                                {imageStr}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-sm text-center px-2 text-muted-foreground">
                            Image data unavailable
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                        Image {index + 1}
                      </div>
                      {user?.role === "admin" && image && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-7 w-7 rounded-full bg-white shadow-md"
                            onClick={(e) => {
                              e.stopPropagation(); 
                              if (image && typeof image.toString === 'function') {
                                window.open(image.toString(), '_blank');
                              }
                            }}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Editable mode for shelf images
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Generate 8 image upload placeholders in a grid */}
                {Array.from({ length: 8 }).map((_, index) => (
                  <div 
                    key={index} 
                    className="relative border rounded-md overflow-hidden aspect-square flex flex-col items-center justify-center bg-muted/30"
                  >
                    {shelfImages[index] ? (
                      // Show the image if uploaded
                      <div className="w-full h-full relative group">
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          {shelfImages[index] instanceof File ? (
                            // Show preview for File objects
                            <img 
                              src={URL.createObjectURL(shelfImages[index] as File)} 
                              alt={`Shelf image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : typeof shelfImages[index] === 'string' ? (
                            // Show image for string paths
                            <img 
                              src={shelfImages[index] as string} 
                              alt={`Shelf image ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-image.svg';
                                (e.target as HTMLImageElement).className = 'w-1/2 h-1/2 object-contain opacity-50';
                              }}
                            />
                          ) : (
                            <span className="text-sm text-center px-2 text-muted-foreground">
                              Image not available
                            </span>
                          )}
                        </div>
                        
                        {/* Remove button overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleRemoveShelfImage(index)}
                          >
                            <Trash className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Show upload option if no image
                      <>
                        <label 
                          htmlFor={`shelf-image-${index}`}
                          className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-muted/50 transition-colors p-4"
                        >
                          <Camera className="h-8 w-8 mb-2 text-muted-foreground" />
                          <span className="text-xs text-center text-muted-foreground">
                            {`Photo ${index + 1}`}
                          </span>
                          <input
                            type="file"
                            id={`shelf-image-${index}`}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleShelfImageUpload(index, e)}
                          />
                        </label>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">Direct Image Upload</h3>
                <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-4">
                  <div className="flex items-center text-blue-700 mb-2">
                    <Camera className="h-5 w-5 mr-2" />
                    <span className="font-medium">Upload shelf images</span>
                  </div>
                  <p className="text-sm text-blue-600 mb-3">
                    Add images by selecting any empty slot above or use the button below to add multiple images at once
                  </p>
                  <label htmlFor="bulk-image-upload" className="cursor-pointer">
                    <div className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>Add Multiple Images</span>
                    </div>
                    <input
                      id="bulk-image-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          // Find all empty slots
                          const emptySlots = shelfImages
                            .map((img, index) => img === null ? index : -1)
                            .filter(index => index !== -1);
                          
                          // Store files in available slots
                          const newShelfImages = [...shelfImages];
                          let filesAdded = 0;
                          
                          for (let i = 0; i < Math.min(files.length, emptySlots.length); i++) {
                            newShelfImages[emptySlots[i]] = files[i];
                            filesAdded++;
                          }
                          
                          // Update the shelf images
                          setShelfImages(newShelfImages);
                          
                          // Show success message
                          toast({
                            title: "Images added",
                            description: `Added ${filesAdded} ${filesAdded === 1 ? 'image' : 'images'} to your stock take`,
                          });
                          
                          // Reset the input
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">Upload photos of the shelf to document the stock take</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">
            {isReadOnly ? 'Merchandiser Comments' : 'Comments'}
          </h2>
          
          {isReadOnly ? (
            /* Enhanced read-only comment display */
            <div>
              {!comments || comments.trim() === '' ? (
                <div className="bg-muted/50 rounded-lg p-6 text-center">
                  <div className="flex justify-center mb-3">
                    <ClipboardList className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No Comments</h3>
                  <p className="text-muted-foreground">No additional comments were provided for this stock take.</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-start mb-3">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                      <ClipboardList className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-800">Submitted Notes</h4>
                      <p className="text-xs text-muted-foreground">
                        {stockTake?.date ? new Date(stockTake.date).toLocaleDateString() : 'Date not available'}
                      </p>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none ml-12 p-3 bg-gray-50 rounded-md border border-gray-100">
                    {comments.split('\n').map((line, i) => (
                      <p key={i} className={line.trim() === '' ? 'my-2' : 'mb-2'}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Editable comments */
            <Textarea 
              id="comments" 
              placeholder="Add any additional notes or observations here..."
              className="min-h-[120px]"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          )}
        </div>
      </div>
      
      {!isReadOnly && (
        <Button 
          onClick={submitStockTake} 
          disabled={loading || stockData.length === 0}
          className="w-full"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
          Submit Stock Take
        </Button>
      )}
      
      {isReadOnly && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="flex justify-center mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-medium text-green-800 mb-1">Stock Take Completed</h3>
          <p className="text-sm text-green-700">
            This stock take has been submitted and completed. No further changes can be made.
          </p>
        </div>
      )}
      
      {/* Admin Data Overview section - Only visible to admins */}
      {isReadOnly && user?.role === "admin" && (
        <div className="mt-8 border-t pt-8">
          <h2 className="text-2xl font-bold mb-6 text-primary">Admin Data Overview</h2>
          <p className="text-sm text-muted-foreground mb-4">Comprehensive view of all data submitted by the merchandiser for this work item.</p>
          
          <div className="space-y-6">
            {/* Tabs for different data types */}
            <Tabs defaultValue="stock-take" className="w-full">
              <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 lg:flex">
                <TabsTrigger value="stock-take" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <span>Stock Take</span>
                </TabsTrigger>
                <TabsTrigger value="merchandising" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span>Merchandising</span>
                </TabsTrigger>
                <TabsTrigger value="competitor" className="flex items-center gap-2">
                  <BarChart className="h-4 w-4" />
                  <span>Competitor Data</span>
                </TabsTrigger>
                <TabsTrigger value="order" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Order Data</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Stock Take Data Tab */}
              <TabsContent value="stock-take" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ClipboardList className="h-5 w-5 mr-2 text-primary" />
                      Stock Take Details
                    </CardTitle>
                    <CardDescription>
                      Inventory data submitted by merchandiser
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-medium mb-1">Submitted Date</h3>
                          <p>{stockTake?.date ? new Date(stockTake.date).toLocaleString() : 'Not available'}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium mb-1">Status</h3>
                          <Badge variant={stockTake?.status === 'completed' ? 'success' : 'default'}>
                            {stockTake?.status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                      
                      {stockTake?.items && stockTake.items.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium mb-2">Inventory Items ({stockTake.items.length})</h3>
                          <div className="border rounded-md overflow-hidden">
                            <table className="min-w-full divide-y divide-border">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">SKU</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Min Level</th>
                                </tr>
                              </thead>
                              <tbody className="bg-card divide-y divide-border">
                                {stockTake?.items?.map((item: any) => (
                                  <tr key={item.id}>
                                    <td className="px-4 py-3 text-sm">{item.product?.name || 'Unknown Product'}</td>
                                    <td className="px-4 py-3 text-sm">{item.product?.sku || 'N/A'}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <Badge variant="outline" className="capitalize">
                                        {item.location?.replace('_', ' ') || item.location}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className={(item.quantity && item.product?.minStockLevel && item.quantity < item.product.minStockLevel) ? 'text-red-600 font-medium' : ''}>
                                        {item.quantity}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{item.product?.minStockLevel || 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      {/* Show shelf images if available */}
                      {stockTake?.pictures && stockTake?.pictures.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium mb-2">Stock Take Images ({stockTake?.pictures.length})</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {stockTake?.pictures.map((imagePath: string, index: number) => {
                              // Extract filename from path
                              const filename = imagePath.split('/').pop() || imagePath;
                              const imageUrl = `/api/images/${filename}`;
                              
                              return (
                                <div 
                                  key={index} 
                                  className="relative aspect-square rounded-md overflow-hidden border hover:shadow-md transition-shadow cursor-pointer"
                                  onClick={() => window.open(imageUrl, '_blank')}
                                >
                                  <img
                                    src={imageUrl}
                                    alt={`Stock take image ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-full h-full bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">Image not found</div>`;
                                      }
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Merchandising Data Tab */}
              <TabsContent value="merchandising" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Tag className="h-5 w-5 mr-2 text-primary" />
                      Merchandising Details
                    </CardTitle>
                    <CardDescription>
                      Merchandising data submitted by merchandiser
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!merchandisingData ? (
                      <div className="text-center py-12 px-4">
                        <Tag className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-lg font-medium text-muted-foreground mb-1">No Merchandising Data</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          This work item does not have any merchandising data submitted by the merchandiser.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-sm font-medium mb-1">Created Date</h3>
                            <p>{merchandisingData.createdAt ? new Date(merchandisingData.createdAt).toLocaleString() : 'Not available'}</p>
                          </div>
                        </div>
                        
                        {merchandisingData.items && merchandisingData.items.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium mb-2">Promotional Items</h3>
                            <div className="border rounded-md overflow-hidden">
                              <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                  {merchandisingData.items.map((item: any, index: number) => (
                                    <tr key={index}>
                                      <td className="px-4 py-3 text-sm">{item.product?.name || 'Unknown Product'}</td>
                                      <td className="px-4 py-3 text-sm">R {item.price?.toFixed(2) || '0.00'}</td>
                                      <td className="px-4 py-3 text-sm">{item.notes || 'No notes'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        {merchandisingData.comment && (
                          <div>
                            <h3 className="text-sm font-medium mb-2">Additional Notes</h3>
                            <div className="border rounded-md p-4 bg-muted/30">
                              <p>{merchandisingData.comment}</p>
                            </div>
                          </div>
                        )}

                        {/* Show promotion images if available */}
                        {merchandisingData.promotionPictures && merchandisingData.promotionPictures.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium mb-2">Promotion Images ({merchandisingData.promotionPictures.length})</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {merchandisingData.promotionPictures.map((imagePath: string, index: number) => {
                                // Extract filename from path
                                const filename = imagePath.split('/').pop() || imagePath;
                                const imageUrl = `/api/images/${filename}`;
                                
                                return (
                                  <div 
                                    key={index} 
                                    className="relative aspect-square rounded-md overflow-hidden border hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => window.open(imageUrl, '_blank')}
                                  >
                                    <img
                                      src={imageUrl}
                                      alt={`Promotion image ${index + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = `<div class="w-full h-full bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">Image not found</div>`;
                                        }
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Competitor Data Tab */}
              <TabsContent value="competitor" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart className="h-5 w-5 mr-2 text-primary" />
                      Competitor Analysis
                    </CardTitle>
                    <CardDescription>
                      Competitor data submitted by merchandiser
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!competitorData ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No competitor analysis data available for this work item.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-sm font-medium mb-1">Created Date</h3>
                            <p>{competitorData.createdAt ? new Date(competitorData.createdAt).toLocaleString() : 'Not available'}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium mb-1">Competitor Name</h3>
                            <p>{competitorData.competitorName || 'Not specified'}</p>
                          </div>
                        </div>
                        
                        {competitorData.items && competitorData.items.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium mb-2">Competitor Products</h3>
                            <div className="border rounded-md overflow-hidden">
                              <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Product Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                  {competitorData.items.map((item: any, index: number) => (
                                    <tr key={index}>
                                      <td className="px-4 py-3 text-sm">{item.productName || 'Unnamed Product'}</td>
                                      <td className="px-4 py-3 text-sm">{item.brand || 'Unknown'}</td>
                                      <td className="px-4 py-3 text-sm">R {item.price?.toFixed(2) || '0.00'}</td>
                                      <td className="px-4 py-3 text-sm">{item.notes || 'No notes'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        {competitorData.generalNotes && (
                          <div>
                            <h3 className="text-sm font-medium mb-2">General Observations</h3>
                            <div className="border rounded-md p-4 bg-muted/30">
                              <p>{competitorData.generalNotes}</p>
                            </div>
                          </div>
                        )}

                        {/* Show competitor images if available */}
                        {competitorData.pictures && competitorData.pictures.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium mb-2">Competitor Images ({competitorData.pictures.length})</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {competitorData.pictures.map((imagePath: string, index: number) => {
                                // Extract filename from path
                                const filename = imagePath.split('/').pop() || imagePath;
                                const imageUrl = `/api/images/${filename}`;
                                
                                return (
                                  <div 
                                    key={index} 
                                    className="relative aspect-square rounded-md overflow-hidden border hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => window.open(imageUrl, '_blank')}
                                  >
                                    <img
                                      src={imageUrl}
                                      alt={`Competitor image ${index + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = `<div class="w-full h-full bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">Image not found</div>`;
                                        }
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Order Data Tab */}
              <TabsContent value="order" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingCart className="h-5 w-5 mr-2 text-primary" />
                      Order Details
                    </CardTitle>
                    <CardDescription>
                      Order data submitted by merchandiser
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!orderData ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No order data available for this work item.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <h3 className="text-sm font-medium mb-1">Order Date</h3>
                            <p>{orderData.orderDate ? new Date(orderData.orderDate).toLocaleString() : 'Not available'}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium mb-1">Status</h3>
                            <Badge variant={
                              orderData.status === 'completed' 
                                ? 'success' 
                                : orderData.status === 'rejected' 
                                  ? 'destructive' 
                                  : 'default'
                            }>
                              {orderData.status}
                            </Badge>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium mb-1">Total Items</h3>
                            <p>{orderData.items?.length || 0}</p>
                          </div>
                        </div>
                        
                        {orderData.items && orderData.items.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium mb-2">Ordered Items</h3>
                            <div className="border rounded-md overflow-hidden">
                              <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">SKU</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit Price</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                  {orderData.items.map((item: any, index: number) => (
                                    <tr key={index}>
                                      <td className="px-4 py-3 text-sm">{item.productName || 'Unknown Product'}</td>
                                      <td className="px-4 py-3 text-sm">{item.productSku || 'N/A'}</td>
                                      <td className="px-4 py-3 text-sm">{item.quantity}</td>
                                      <td className="px-4 py-3 text-sm">R {item.productPrice ? item.productPrice.toFixed(2) : '0.00'}</td>
                                      <td className="px-4 py-3 text-sm font-medium">
                                        R {item.productPrice && item.quantity ? (item.productPrice * item.quantity).toFixed(2) : '0.00'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        {orderData.notes && (
                          <div>
                            <h3 className="text-sm font-medium mb-2">Order Notes</h3>
                            <div className="border rounded-md p-4 bg-muted/30">
                              <p>{orderData.notes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
};

// Component for Merchandising section
const MerchandisingSection = ({ storeId, workItemId, navigate, setActiveStep }: MerchandisingSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [promotionPictures, setPromotionPictures] = useState<string[]>([]);
  const [promotionItems, setPromotionItems] = useState<PromotionItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [price, setPrice] = useState<string>("0.00");
  const { toast } = useToast();

  // Save draft mutation for merchandising
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const merchandisingData = {
        storeId,
        workItemId,
        merchandisingItems: promotionItems.map(item => ({
          productId: item.productId,
          price: item.price,
          notes: item.notes || ''
        })),
        status: 'draft'
      };

      if (promotionPictures.length > 0) {
        (merchandisingData as any).promotionPictures = promotionPictures;
      }

      const response = await apiRequest("POST", "/api/merchandising", merchandisingData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/merchandising/by-work-item', workItemId] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
      
      toast({
        title: "Draft saved",
        description: "Your merchandising progress has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Listen for save draft events
  useEffect(() => {
    const handleSaveDraft = (event: CustomEvent) => {
      const { activeStep } = event.detail;
      
      if (activeStep === 'merchandising') {
        if (promotionItems.length > 0 || promotionPictures.length > 0) {
          saveDraftMutation.mutate();
        } else {
          toast({
            title: "Nothing to save",
            description: "Add some promotion items or pictures before saving.",
            variant: "destructive"
          });
        }
      }
    };

    window.addEventListener('saveDraft', handleSaveDraft as EventListener);
    
    return () => {
      window.removeEventListener('saveDraft', handleSaveDraft as EventListener);
    };
  }, [promotionItems, promotionPictures, saveDraftMutation, toast]);
  
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!storeId,
  });
  
  const submitMerchandising = async () => {
    setLoading(true);
    try {
      // If no promotion items or pictures, just skip to the next step
      if (promotionItems.length === 0 && promotionPictures.length === 0) {
        // Skip to the next step without saving any data
        toast({
          title: "Step skipped",
          description: "Merchandising step was skipped",
        });
        
        // Move to the next step in the process
        setTimeout(() => {
          setActiveStep("competitor-analysis");
        }, 500);
        setLoading(false);
        return;
      }
      
      // Create merchandising promotion
      const merchandisingData = {
        storeId,
        workItemId,
        merchandisingItems: promotionItems.map(item => ({
          productId: item.productId,
          price: item.price,
          notes: item.notes || '' // Add empty notes if not present
        }))
      };
      
      // Include pictures if available (not required by server but stored for future reference)
      if (promotionPictures.length > 0) {
        // @ts-ignore - we're adding an extra field that the server will ignore
        merchandisingData.promotionPictures = promotionPictures;
      }
      
      const response = await apiRequest("POST", "/api/merchandising", merchandisingData);
      const result = await response.json();
      
      toast({
        title: "Merchandising data submitted",
        description: "Your merchandising information has been submitted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      
      // Move to the next step in the process
      setTimeout(() => {
        setActiveStep("competitor-analysis");
      }, 1000);
    } catch (error) {
      console.error("Error submitting merchandising data:", error);
      toast({
        title: "Error",
        description: "Failed to submit merchandising data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newPictures = [...promotionPictures];
      for (let i = 0; i < files.length; i++) {
        newPictures.push(files[i].name);
      }
      setPromotionPictures(newPictures);
    }
  };
  
  const handleAddPromotionItem = () => {
    if (!selectedProduct) return;
    
    const numPrice = parseFloat(price) || 0;
    
    const newItems = [...promotionItems];
    const existingIndex = newItems.findIndex(item => item.productId === selectedProduct.id);
    
    if (existingIndex >= 0) {
      newItems[existingIndex].price = Math.round(numPrice * 100); // Convert to cents
    } else {
      newItems.push({
        productId: selectedProduct.id,
        price: Math.round(numPrice * 100), // Convert to cents
        notes: '' // Add empty notes by default
      });
    }
    
    setPromotionItems(newItems);
    
    // Reset form
    setSelectedProduct(null);
    setPrice("0.00");
    
    toast({
      title: "Promotion product added",
      description: `Added ${selectedProduct.name} with price R${numPrice.toFixed(2)}`,
    });
  };
  
  // Function to get added promotion products
  const getAddedProducts = () => {
    return promotionItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return null;
      
      return {
        product,
        price: item.price
      };
    }).filter(Boolean);
  };
  
  // Get products added to the promotion
  const addedPromotionProducts = getAddedProducts();
  
  return (
    <div className="space-y-6">
      {/* Promotion Products & Pricing Section */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold w-full">Promotion Products & Pricing</h2>
          <Button 
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto" 
            onClick={() => document.getElementById('promotion-pictures')?.click()}
          >
            <Camera className="h-5 w-5" />
            Upload Promotion Photos
          </Button>
          <Input 
            id="promotion-pictures" 
            type="file" 
            multiple 
            onChange={handleFileUpload} 
            className="hidden"
          />
        </div>
        
        <div className="grid md:grid-cols-12 gap-4 mb-6">
          <div className="md:col-span-7">
            <label className="text-base font-medium mb-2 block">Product</label>
            <Combobox
              value={selectedProduct?.id?.toString() || ""}
              onChange={(value) => {
                const product = products.find(p => p.id === parseInt(value));
                if (product) {
                  setSelectedProduct(product);
                }
              }}
              placeholder="Select a product..."
              options={
                products.map((product) => ({
                  label: `${product.name} (${product.sku})`,
                  value: product.id.toString()
                }))
              }
              renderItem={(option: ComboboxOption) => (
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="truncate">{option.label}</span>
                </div>
              )}
            />
          </div>
          
          <div className="md:col-span-3">
            <label className="text-base font-medium mb-2 block">Price (R)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">R</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-10 pl-7"
              />
            </div>
          </div>
          
          <div className="md:col-span-2 flex items-end">
            <Button 
              className="w-full h-10"
              disabled={!selectedProduct} 
              onClick={handleAddPromotionItem}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-4">Promotion Products</h3>
          
          {/* No Products State */}
          {addedPromotionProducts.length === 0 ? (
            <div className="bg-muted/50 rounded-lg p-8 text-center">
              <div className="flex justify-center mb-4">
                <Tag className="h-16 w-16 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium text-muted-foreground mb-2">No products added yet.</h3>
              <p className="text-muted-foreground">Select a product and price to add it to the promotion.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {addedPromotionProducts.map(item => (
                <div key={item?.product?.id || 'unknown'} className="bg-card border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">{item?.product?.name || 'Unknown Product'}</h4>
                      <p className="text-sm text-muted-foreground">SKU: {item?.product?.sku || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-lg">R{((item?.price || 0) / 100).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Regular: R{((item?.product?.price || 0) / 100).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Show selected promotion pictures */}
      {promotionPictures.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Uploaded Promotion Photos</h3>
          <ul className="list-disc pl-5 text-sm">
            {promotionPictures.map((pic, index) => (
              <li key={index}>{pic}</li>
            ))}
          </ul>
        </div>
      )}
      
      <Button 
        onClick={submitMerchandising} 
        disabled={loading}
        className="w-full"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Tag className="mr-2 h-4 w-4" />}
        {promotionItems.length === 0 && promotionPictures.length === 0 ? "Skip Merchandising Step" : "Submit Merchandising Information"}
      </Button>
    </div>
  );
};

// Component for Competitor Analysis section
const CompetitorAnalysisSection = ({ storeId, workItemId, navigate, setActiveStep }: CompetitorAnalysisSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [promotionalPrice, setPromotionalPrice] = useState<number | null>(null);
  const [pictures, setPictures] = useState<string[]>([]);
  const { toast } = useToast();

  // Save draft mutation for competitor analysis
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const competitorData = {
        storeId,
        workItemId,
        competitorName: brand,
        generalNotes: productDescription,
        competitorItems: promotionalPrice ? [{
          productName: productDescription,
          brand: brand,
          price: promotionalPrice,
          notes: ''
        }] : [],
        status: 'draft'
      };

      if (pictures.length > 0) {
        (competitorData as any).pictures = pictures;
      }

      const response = await apiRequest("POST", "/api/competitor-merchandising", competitorData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitor-merchandising/by-work-item', workItemId] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
      
      toast({
        title: "Draft saved",
        description: "Your competitor analysis progress has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Listen for save draft events
  useEffect(() => {
    const handleSaveDraft = (event: CustomEvent) => {
      const { activeStep } = event.detail;
      
      if (activeStep === 'competitor-analysis') {
        if (brand || productDescription || promotionalPrice || pictures.length > 0) {
          saveDraftMutation.mutate();
        } else {
          toast({
            title: "Nothing to save",
            description: "Add competitor information before saving.",
            variant: "destructive"
          });
        }
      }
    };

    window.addEventListener('saveDraft', handleSaveDraft as EventListener);
    
    return () => {
      window.removeEventListener('saveDraft', handleSaveDraft as EventListener);
    };
  }, [brand, productDescription, promotionalPrice, pictures, saveDraftMutation, toast]);
  
  const submitCompetitorAnalysis = async () => {
    setLoading(true);
    try {
      // If brand and product description are empty, just skip to the next step
      if (!brand && !productDescription) {
        // Skip to the next step without saving any data
        toast({
          title: "Step skipped",
          description: "Competitor analysis step was skipped",
        });
        
        // Move to the next step in the process
        setTimeout(() => {
          setActiveStep("order-placement");
        }, 500);
        setLoading(false);
        return;
      }
      
      // Create a FormData object for file uploads
      const formData = new FormData();
      formData.append('storeId', storeId.toString());
      formData.append('workItemId', workItemId.toString());
      formData.append('brand', brand);
      formData.append('productDescription', productDescription);
      if (promotionalPrice !== null) {
        formData.append('promotionalPrice', promotionalPrice.toString());
      }
      
      // Get file inputs and append to FormData if available
      const fileInput = document.getElementById('competitor-pictures') as HTMLInputElement;
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const files = fileInput.files;
        for (let i = 0; i < files.length; i++) {
          formData.append('promotionPictures', files[i]);
        }
      }
      
      console.log("Submitting competitor data with files");
      
      // Use fetch directly for multipart/form-data
      const response = await fetch('/api/competitor-merchandising', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "Competitor analysis submitted",
        description: "Your competitor analysis has been submitted successfully",
      });
      
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      queryClient.invalidateQueries({ queryKey: [`/api/competitor-merchandising/by-work-item/${workItemId}`] });
      
      // Move to the next step in the process
      setTimeout(() => {
        setActiveStep("order-placement");
      }, 1000);
    } catch (error) {
      console.error("Error submitting competitor analysis:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit competitor analysis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newPictures = [...pictures];
      for (let i = 0; i < files.length; i++) {
        newPictures.push(files[i].name);
      }
      setPictures(newPictures);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="brand">Competitor Brand</Label>
        <Input 
          id="brand" 
          placeholder="Enter competitor brand name" 
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="product-description">Product Description</Label>
        <Textarea 
          id="product-description" 
          placeholder="Describe the competitor product..." 
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="promotional-price">Promotional Price (cents)</Label>
        <Input 
          id="promotional-price" 
          type="number" 
          placeholder="Enter price in cents" 
          min="0"
          onChange={(e) => setPromotionalPrice(parseInt(e.target.value) || null)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="competitor-pictures">Upload Pictures</Label>
        <Input id="competitor-pictures" type="file" multiple onChange={handleFileUpload} />
        {pictures.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium">Selected files:</p>
            <ul className="list-disc pl-5 text-sm">
              {pictures.map((pic, index) => (
                <li key={index}>{pic}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <Button 
        onClick={submitCompetitorAnalysis} 
        disabled={loading}
        className="w-full"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart className="mr-2 h-4 w-4" />}
        {!brand && !productDescription ? "Skip Competitor Analysis Step" : "Submit Competitor Analysis"}
      </Button>
    </div>
  );
};

// Component for Order Placement section
const OrderPlacementSection = ({ storeId, workItemId, navigate, setActiveStep, lowStockItems = [] }: OrderPlacementSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [pictures, setPictures] = useState<string[]>([]);
  const [orderItems, setOrderItems] = useState<{productId: number, quantity: number, notes: string}[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [itemNotes, setItemNotes] = useState("");
  const { toast } = useToast();

  // Save draft mutation for order placement
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        storeId,
        workItemId,
        orderItems: orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes || ''
        })),
        notes: notes,
        status: 'draft'
      };

      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/by-work-item', workItemId] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
      
      toast({
        title: "Draft saved",
        description: "Your order progress has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Listen for save draft events
  useEffect(() => {
    const handleSaveDraft = (event: CustomEvent) => {
      const { activeStep } = event.detail;
      
      if (activeStep === 'order-placement') {
        if (orderItems.length > 0 || notes) {
          saveDraftMutation.mutate();
        } else {
          toast({
            title: "Nothing to save",
            description: "Add some order items or notes before saving.",
            variant: "destructive"
          });
        }
      }
    };

    window.addEventListener('saveDraft', handleSaveDraft as EventListener);
    
    return () => {
      window.removeEventListener('saveDraft', handleSaveDraft as EventListener);
    };
  }, [orderItems, notes, saveDraftMutation, toast]);
  
  // Fetch products and low stock data
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!storeId,
  });
  
  // Get stock take data to identify low stock items
  const { data: stockTakes = [] } = useQuery<StockTakeData[]>({
    queryKey: ['/api/stock-takes'],
    enabled: !!storeId,
  });
  
  // Process low stock items from parent component when the component mounts
  useEffect(() => {
    if (lowStockItems && lowStockItems.length > 0) {
      // Process automatically when coming from stock take with detected low stock items
      const newOrderItems = lowStockItems.map(item => ({
        productId: item.product.id,
        quantity: Math.max(item.product.minStockLevel - item.quantity, 1), // Order enough to reach min threshold
        notes: `Auto-added from stock take - ${item.location} (Current: ${item.quantity}, Min: ${item.product.minStockLevel})`
      }));
      
      setOrderItems(prevItems => {
        // Merge with any existing items, avoiding duplicates
        const existingProductIds = prevItems.map(item => item.productId);
        const uniqueNewItems = newOrderItems.filter(item => !existingProductIds.includes(item.productId));
        return [...prevItems, ...uniqueNewItems];
      });
      
      if (newOrderItems.length > 0) {
        toast({
          title: "Low stock items added",
          description: `${newOrderItems.length} item(s) automatically added from stock take`,
        });
      }
    }
  }, [lowStockItems, toast]);
  
  const { data: stockTakeItems = [] } = useQuery<StockTakeDataItem[]>({
    queryKey: ['/api/stock-take-items'],
    enabled: stockTakes.length > 0,
  });
  
  // Get inventory data related to this store
  const { data: inventory = [] } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory', { storeId }],
    enabled: !!storeId,
  });
  
  // Helper function to identify items below threshold from inventory data
  const getInventoryLowStockItems = useCallback(() => {
    if (!products.length || !inventory.length) return [];
    
    return inventory
      .filter(item => {
        const product = products.find(p => p.id === item.productId);
        return product && item.quantity < product.minStockLevel;
      })
      .map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name || 'Unknown product',
          currentStock: item.quantity,
          minStockLevel: product?.minStockLevel || 5,
          quantityToOrder: product ? Math.max(product.minStockLevel - item.quantity, 1) : 1
        };
      });
  }, [products, inventory]);
  
  const systemLowStockItems = getInventoryLowStockItems();
  
  // Add a system-detected low stock item to the order
  const addSystemLowStockItem = (item: any) => {
    // Check if the item is already in the order
    const existingItem = orderItems.find(orderItem => orderItem.productId === item.productId);
    
    if (existingItem) {
      // Update the existing item quantity
      setOrderItems(prev => 
        prev.map(orderItem => 
          orderItem.productId === item.productId
            ? { ...orderItem, quantity: item.quantityToOrder }
            : orderItem
        )
      );
      
      toast({
        title: "Order updated",
        description: `Updated ${item.productName} quantity to ${item.quantityToOrder}`,
      });
    } else {
      // Add as a new item
      setOrderItems(prev => [
        ...prev,
        {
          productId: item.productId,
          quantity: item.quantityToOrder,
          notes: `Auto-added due to low stock (${item.currentStock}/${item.minStockLevel})`
        }
      ]);
      
      toast({
        title: "Item added",
        description: `Added ${item.productName} to order`,
      });
    }
  };
  
  // Add all system-detected low stock items to the order at once
  const addAllSystemLowStockItems = () => {
    if (systemLowStockItems.length === 0) return;
    
    // Create a map of existing order items by productId for quick lookup
    const existingItemsMap = new Map(
      orderItems.map(item => [item.productId, item])
    );
    
    // Process all low stock items
    const updatedOrderItems = [...orderItems];
    let addedCount = 0;
    let updatedCount = 0;
    
    systemLowStockItems.forEach(lowStockItem => {
      const existingItem = existingItemsMap.get(lowStockItem.productId);
      
      if (existingItem) {
        // Update existing item
        const itemIndex = updatedOrderItems.findIndex(
          item => item.productId === lowStockItem.productId
        );
        if (itemIndex !== -1) {
          updatedOrderItems[itemIndex] = {
            ...updatedOrderItems[itemIndex],
            quantity: lowStockItem.quantityToOrder
          };
          updatedCount++;
        }
      } else {
        // Add new item
        updatedOrderItems.push({
          productId: lowStockItem.productId,
          quantity: lowStockItem.quantityToOrder,
          notes: `Auto-added due to low stock (${lowStockItem.currentStock}/${lowStockItem.minStockLevel})`
        });
        addedCount++;
      }
    });
    
    // Update the state with all changes at once
    setOrderItems(updatedOrderItems);
    
    // Show toast notification with results
    toast({
      title: "Low stock items processed",
      description: `Added ${addedCount} new items and updated ${updatedCount} existing items`,
    });
  };
  
  // Add manual item to order
  const addItemToOrder = () => {
    if (!selectedProduct) return;
    
    const numQuantity = parseInt(quantity) || 1;
    
    // Add the selected product to order items
    setOrderItems(prev => [
      ...prev, 
      {
        productId: selectedProduct.id,
        quantity: numQuantity,
        notes: itemNotes
      }
    ]);
    
    // Reset form
    setSelectedProduct(null);
    setQuantity("1");
    setItemNotes("");
    
    toast({
      title: "Item added",
      description: `Added ${selectedProduct.name} to order`
    });
  };
  

  
  const submitOrder = async () => {
    setLoading(true);
    try {
      // If no notes, pictures, or items are provided, we're skipping the order step
      if (!notes && pictures.length === 0 && orderItems.length === 0) {
        toast({
          title: "Step skipped",
          description: "Order step was skipped, completing work item",
        });
        
        // Skip order creation, but still mark the work item as completed
        try {
          // Call the API to mark the work item as completed
          await apiRequest("PUT", `/api/work-items/${workItemId}/status`, { 
            status: WorkItemStatus.COMPLETED 
          });
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
          queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
          
          toast({
            title: "Work item completed",
            description: "Your work item has been marked as completed",
          });
          
          // Move to the final success step
          setTimeout(() => {
            setActiveStep("completed");
          }, 1000);
          setLoading(false);
          return;
        } catch (error) {
          console.error("Error completing work item:", error);
          toast({
            title: "Error",
            description: "Failed to mark work item as completed",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
      
      // Create order if we have notes, pictures, or order items
      const orderData = {
        storeId,
        workItemId,
        userId: 0, // Will be set by the server from the authenticated user
        notes: notes || "No notes provided",
        status: "submitted",
        priority: "medium",
        date: new Date(),
        products: orderItems
      };
      
      // Add pictures if any
      if (pictures.length > 0) {
        // @ts-ignore
        orderData.pictures = pictures;
      }
      
      const response = await apiRequest("POST", "/api/orders", orderData);
      const result = await response.json();
      
      toast({
        title: "Order submitted",
        description: "Your order has been submitted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Mark the work item as completed and move to the success step
      try {
        // Call the API to mark the work item as completed
        await apiRequest("PUT", `/api/work-items/${workItemId}/status`, { 
          status: WorkItemStatus.COMPLETED 
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
        queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
        
        toast({
          title: "Work item completed",
          description: "Your work item has been marked as completed",
        });
        
        // Move to the final success step
        setTimeout(() => {
          setActiveStep("completed");
        }, 1000);
      } catch (error) {
        console.error("Error completing work item:", error);
        toast({
          title: "Error",
          description: "Failed to mark work item as completed, but your order was saved",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      toast({
        title: "Error",
        description: "Failed to submit order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newPictures = [...pictures];
      for (let i = 0; i < files.length; i++) {
        newPictures.push(files[i].name);
      }
      setPictures(newPictures);
    }
  };
  
  return (
    <div className="space-y-8">
      {/* Low Stock Items Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-lg">Low Stock Items</h3>
          {systemLowStockItems.length > 0 && (
            <Button 
              onClick={addAllSystemLowStockItems} 
              variant="secondary" 
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" /> Add All to Order
            </Button>
          )}
        </div>
        
        {systemLowStockItems.length === 0 ? (
          <div className="text-center p-4 bg-muted rounded-md">
            <ShoppingBasket className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No low stock items detected.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {systemLowStockItems.map((item) => (
              <div key={item.productId} className="flex justify-between items-center p-3 border rounded-md">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <span>Current: {item.currentStock}</span>
                    <span>•</span>
                    <span>Min: {item.minStockLevel}</span>
                    <span>•</span>
                    <span className="text-primary">Need: {item.quantityToOrder}</span>
                  </div>
                </div>
                <Button 
                  onClick={() => addSystemLowStockItem(item)} 
                  variant="outline" 
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Manual Order Items Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Add Items Manually</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <Combobox
              value={selectedProduct?.id?.toString() || ""}
              onChange={(value) => {
                const product = products.find(p => p.id === parseInt(value));
                if (product) {
                  setSelectedProduct(product);
                }
              }}
              placeholder="Select a product..."
              options={
                products.map((product) => ({
                  label: `${product.name} (${product.sku})`,
                  value: product.id.toString()
                }))
              }
              renderItem={(option: ComboboxOption) => (
                <div className="flex items-center">
                  <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="truncate">{option.label}</span>
                </div>
              )}
            />
          </div>
          <div className="w-24">
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Qty"
            />
          </div>
          <Button onClick={addItemToOrder} disabled={!selectedProduct}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="item-notes">Item Notes</Label>
          <Textarea 
            id="item-notes" 
            placeholder="Additional notes for this item..." 
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>
      
      {/* Added Items List */}
      {orderItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Order Items</h3>
          <div className="space-y-2">
            {orderItems.map((item, index) => {
              const product = products.find(p => p.id === item.productId);
              return (
                <div key={index} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{product?.name || 'Unknown product'}</p>
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                      <span>Qty: {item.quantity}</span>
                      {item.notes && (
                        <>
                          <span>•</span>
                          <span className="italic">{item.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      setOrderItems(orderItems.filter((_, i) => i !== index));
                    }} 
                    variant="ghost" 
                    size="sm"
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Order Notes Section */}
      <div className="space-y-2">
        <Label htmlFor="order-notes">General Order Notes</Label>
        <Textarea 
          id="order-notes" 
          placeholder="Provide details for this order..." 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="order-pictures">Upload Pictures (optional)</Label>
        <Input id="order-pictures" type="file" multiple onChange={handleFileUpload} />
        {pictures.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium">Selected files:</p>
            <ul className="list-disc pl-5 text-sm">
              {pictures.map((pic, index) => (
                <li key={index}>{pic}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <Button 
        onClick={submitOrder} 
        disabled={loading}
        className="w-full"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
        {!notes && orderItems.length === 0 ? "Skip Order Step & Complete" : "Submit Order & Complete"}
      </Button>
    </div>
  );
};

interface Store {
  id: number;
  name: string;
  location: string;
}

// Main Process Form component
const ProcessForm = () => {
  const [location, navigate] = useLocation();
  
  // Extract parameters from URL using a function for clarity
  const extractParams = () => {
    let extractedWorkItemId = 0;
    let extractedStoreId = 0;

    try {
      // Try window.location.search first (best for direct navigation)
      const windowParams = new URLSearchParams(window.location.search);
      const windowWorkItemId = windowParams.get("workItemId");
      const windowStoreId = windowParams.get("storeId");
      
      if (windowWorkItemId && !isNaN(Number(windowWorkItemId))) {
        extractedWorkItemId = parseInt(windowWorkItemId);
      }
      
      if (windowStoreId && !isNaN(Number(windowStoreId))) {
        extractedStoreId = parseInt(windowStoreId);
      }
      
      // If parameters are still missing, try the location from wouter
      if (extractedWorkItemId === 0 || extractedStoreId === 0) {
        let queryString = "";
        if (location.includes("?")) {
          queryString = location.split("?")[1];
        } else if (location.includes("#") && location.split("#")[1]?.includes("?")) {
          queryString = location.split("#")[1].split("?")[1];
        }
        
        if (queryString) {
          const routerParams = new URLSearchParams(queryString);
          
          // Get work item ID if still missing
          if (extractedWorkItemId === 0) {
            const paramWorkItemId = routerParams.get("workItemId");
            if (paramWorkItemId && !isNaN(Number(paramWorkItemId))) {
              extractedWorkItemId = parseInt(paramWorkItemId);
            }
          }
          
          // Get store ID if still missing
          if (extractedStoreId === 0) {
            const paramStoreId = routerParams.get("storeId");
            if (paramStoreId && !isNaN(Number(paramStoreId))) {
              extractedStoreId = parseInt(paramStoreId);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error parsing URL parameters:", error);
    }
    
    return { extractedWorkItemId, extractedStoreId };
  };
  
  // Get the parameters
  const { extractedWorkItemId: workItemId, extractedStoreId: storeId } = extractParams();
  
  // Log parameters for debugging
  console.log("ProcessForm initialized with:", { 
    workItemId, 
    storeId, 
    location,
    validParams: workItemId > 0 && storeId > 0 
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState<string>("stock-take");
  const [lowStockItems, setLowStockItems] = useState<Array<{product: Product, quantity: number, location: string}>>([]);
  const [showLowStockAlert, setShowLowStockAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch work item data
  const { 
    data: workItem, 
    isLoading: isLoadingWorkItem,
    error: workItemError 
  } = useQuery<WorkItem>({
    queryKey: ['/api/work-items', workItemId],
    enabled: !!workItemId,
  });
  
  // Set activeStep to "completed" if work item is already completed
  // Also restore from draft if available
  useEffect(() => {
    if (workItem && workItem.status === WorkItemStatus.COMPLETED) {
      setActiveStep("completed");
    } else if (workItem && workItem.currentStep) {
      // Resume from saved step
      setActiveStep(workItem.currentStep);
    }
  }, [workItem]);

  // Handle saving draft data
  const handleSaveDraft = () => {
    if (!workItemId) return;
    
    setIsSaving(true);
    
    // We need to collect form data from the currently active section
    // Since each section manages its own state, we'll create a callback system
    const event = new CustomEvent('saveDraft', { 
      detail: { workItemId, activeStep } 
    });
    window.dispatchEvent(event);
    
    setIsSaving(false);
  };
  
  // Fetch store data using all stores and filtering for the right store ID
  // This approach works around the authentication issue for single store endpoint
  const {
    data: storeList,
    isLoading: isLoadingStore,
    error: storeError
  } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
    enabled: !!storeId,
  });
  
  // Find the specific store from the list
  const store = storeList?.find(s => s.id === storeId);
  
  // Update work item status mutation
  const startWorkItemMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/work-items/${id}`, { 
        status 
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
      toast({
        title: "Work item updated",
        description: "Work item status has been updated to in progress",
      });
    },
    onError: (error: Error) => {
      console.error("Error updating work item:", error);
      toast({
        title: "Error",
        description: "Failed to update work item status",
        variant: "destructive",
      });
    }
  });
  
  // Complete work item mutation
  const completeWorkItemMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const res = await apiRequest("PUT", `/api/work-items/${id}/status`, { 
        status: WorkItemStatus.COMPLETED 
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
      toast({
        title: "Work item completed",
        description: "Work item has been marked as completed",
      });
    },
    onError: (error: Error) => {
      console.error("Error completing work item:", error);
      toast({
        title: "Error",
        description: "Failed to mark work item as completed",
        variant: "destructive",
      });
    }
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async ({ workItemId, draftData, currentStep }: { 
      workItemId: number; 
      draftData: any; 
      currentStep: string; 
    }) => {
      const res = await apiRequest("PUT", `/api/work-items/${workItemId}/draft`, {
        draftData,
        currentStep
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
      toast({
        title: "Draft saved",
        description: "Your progress has been saved. You can resume later.",
      });
    },
    onError: (error: Error) => {
      console.error("Error saving draft:", error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    }
  });
  
  // Handle starting the work item
  const handleStartWorkItem = async () => {
    if (workItem && workItem.status === WorkItemStatus.PENDING) {
      try {
        // Try the assigned-work-items endpoint first for merchandisers
        try {
          await apiRequest("PUT", `/api/work-items/${workItemId}/status`, {
            status: WorkItemStatus.IN_PROGRESS
          });
        } catch (err) {
          console.log("Error using main status update endpoint, trying fallback", err);
          // Fallback to the dedicated endpoint for updating status via assigned-work-items
          await apiRequest("PUT", `/api/assigned-work-items/${workItemId}/status`, {
            status: WorkItemStatus.IN_PROGRESS
          });
        }
        
        // Manually invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
        queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
        queryClient.invalidateQueries({ queryKey: ['/api/assigned-work-items', workItemId] });
        
        toast({
          title: "Work item updated",
          description: "Work item status has been updated to in progress",
        });
      } catch (error) {
        console.error("Error updating work item:", error);
        toast({
          title: "Error",
          description: "Failed to update work item status",
          variant: "destructive",
        });
      }
    }
  };
  
  // Navigate back to assignments if no valid work item or store id
  useEffect(() => {
    const checkAndFixParams = async () => {
      console.log(`Checking parameters: workItemId=${workItemId}, storeId=${storeId}`);
      
      // Check if we have workItemId but not storeId
      if (workItemId && !storeId) {
        try {
          // Try to fetch the work item to get its storeId using the assigned-work-items endpoint for merchandisers
          const response = await fetch(`/api/assigned-work-items/${workItemId}`);
          if (response.ok) {
            const workItemData = await response.json();
            if (workItemData && workItemData.storeId) {
              console.log(`Found storeId ${workItemData.storeId} for workItemId ${workItemId}`);
              // Redirect with both parameters
              navigate(`/process-form?workItemId=${workItemId}&storeId=${workItemData.storeId}`);
              return;
            }
          } else {
            // Fallback to admin endpoint if necessary
            console.log("First endpoint failed, trying admin endpoint as fallback");
            const adminResponse = await fetch(`/api/work-items/${workItemId}`);
            if (adminResponse.ok) {
              const adminWorkItemData = await adminResponse.json();
              if (adminWorkItemData && adminWorkItemData.storeId) {
                console.log(`Found storeId ${adminWorkItemData.storeId} from admin endpoint for workItemId ${workItemId}`);
                // Redirect with both parameters
                navigate(`/process-form?workItemId=${workItemId}&storeId=${adminWorkItemData.storeId}`);
                return;
              }
            }
          }
        } catch (err) {
          console.error("Error fetching work item:", err);
        }
      }
      
      // If we still don't have valid parameters, go back to assignments
      if (!workItemId || !storeId) {
        toast({
          title: "Invalid parameters",
          description: "Missing required work item or store information",
          variant: "destructive",
        });
        navigate("/my-assignments");
      }
    };
    
    checkAndFixParams();
  }, [workItemId, storeId, navigate, toast]);
  
  // Loading state
  if (isLoadingWorkItem || isLoadingStore) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6 flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (workItemError || storeError || !workItem || !store) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
              <p className="mb-2">Unable to load work item or store information.</p>
              {workItemError && <p className="text-sm text-muted-foreground mb-1">Work item error: {(workItemError as Error).message}</p>}
              {storeError && <p className="text-sm text-muted-foreground mb-4">Store error: {(storeError as Error).message}</p>}
              <Button 
                variant="default" 
                className="mt-4"
                onClick={() => navigate("/my-assignments")}
              >
                Return to My Assignments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Since the server now handles the permission checks and updates workItem.userId if needed,
  // we don't need to block access here - the server will have already returned a 403 error
  // if the user doesn't have access to this work item
  
  return (
    <div className="container mx-auto py-2 px-2 sm:py-4 sm:px-4">
      <Card>
        <CardHeader>
          {/* Mobile Back Button - Above Title */}
          <div className="mb-2 sm:hidden">
            <Button 
              variant="outline" 
              onClick={() => navigate("/my-assignments")}
              size="sm"
              className="w-full"
            >
              Back to Assignments
            </Button>
          </div>
          
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Process Form</CardTitle>
              <CardDescription>
                Store: {store.name} | {store.location}
              </CardDescription>
            </div>
            
            {/* Desktop Back Button - Right Side */}
            <div className="hidden sm:block">
              <Button 
                variant="outline" 
                onClick={() => navigate("/my-assignments")}
              >
                Back to Assignments
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status indicator and action button */}
          <div className="mb-6 p-4 bg-muted rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-medium">{workItem.title}</h3>
              <p className="text-sm text-muted-foreground">
                Status: <span className={`font-medium ${
                  workItem.status === WorkItemStatus.COMPLETED ? "text-green-600" : 
                  workItem.status === WorkItemStatus.IN_PROGRESS ? "text-blue-600" : 
                  "text-amber-600"
                }`}>
                  {workItem.status ? 
                    workItem.status.charAt(0).toUpperCase() + workItem.status.slice(1).replace('_', ' ') 
                    : 'Unknown'}
                </span>

              </p>
              {workItem.dueDate && (
                <p className="text-sm text-muted-foreground">
                  Due: {new Date(workItem.dueDate).toLocaleDateString()}
                </p>
              )}
              
              {/* Draft indicator */}
              {workItem.draftData && workItem.status === WorkItemStatus.IN_PROGRESS && (
                <div className="flex items-center gap-1 text-sm text-orange-600">
                  <RotateCcw className="h-3 w-3" />
                  <span>Draft saved - Resume from {workItem.currentStep || 'stock-take'}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              {workItem.status === WorkItemStatus.PENDING && (
                <Button onClick={handleStartWorkItem}>
                  Start Work
                </Button>
              )}
              
              {/* Save Draft button - show for pending and in-progress work items */}
              {(workItem.status === WorkItemStatus.PENDING || workItem.status === WorkItemStatus.IN_PROGRESS || !workItem.status || workItem.status === "pending" || workItem.status === "in_progress") && workItem.status !== WorkItemStatus.COMPLETED && workItem.status !== "completed" && (
                <Button 
                  variant="outline" 
                  onClick={handleSaveDraft}
                  disabled={isSaving || saveDraftMutation.isPending}
                >
                  {isSaving || saveDraftMutation.isPending ? "Saving..." : 
                   workItem.draftData ? "Save Progress" : "Save Draft"}
                </Button>
              )}
            </div>
          </div>
          
          {/* Progress stepper - Desktop view (hidden on mobile) */}
          <div className="mb-8 hidden md:block">
            <div className="grid grid-cols-4 gap-4">
              {/* Step 1: Stock Take */}
              <div className="flex flex-col">
                <div className={`h-2 rounded-full mb-2 ${activeStep === 'stock-take' || activeStep === 'merchandising' || activeStep === 'competitor-analysis' || activeStep === 'order-placement' || activeStep === 'completed' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <h3 className={`font-medium ${activeStep === 'stock-take' || activeStep === 'merchandising' || activeStep === 'competitor-analysis' || activeStep === 'order-placement' || activeStep === 'completed' ? 'text-blue-600' : ''}`}>Stock Take</h3>
                <p className="text-sm text-muted-foreground">Stock taking at shelf or Store</p>
              </div>
              
              {/* Step 2: Merchandising */}
              <div className="flex flex-col">
                <div className={`h-2 rounded-full mb-2 ${activeStep === 'merchandising' || activeStep === 'competitor-analysis' || activeStep === 'order-placement' || activeStep === 'completed' ? 'bg-[#7ccd57]' : 'bg-gray-200'}`}></div>
                <h3 className={`font-medium ${activeStep === 'merchandising' || activeStep === 'competitor-analysis' || activeStep === 'order-placement' || activeStep === 'completed' ? 'text-[#7ccd57]' : ''}`}>Merchandising</h3>
                <p className="text-sm text-muted-foreground">Promotions for any of our products</p>
              </div>
              
              {/* Step 3: Competitor Promotions */}
              <div className="flex flex-col">
                <div className={`h-2 rounded-full mb-2 ${activeStep === 'competitor-analysis' || activeStep === 'order-placement' || activeStep === 'completed' ? 'bg-[#7ccd57]' : 'bg-gray-200'}`}></div>
                <h3 className={`font-medium ${activeStep === 'competitor-analysis' || activeStep === 'order-placement' || activeStep === 'completed' ? 'text-[#7ccd57]' : ''}`}>Competitor Promotions</h3>
                <p className="text-sm text-muted-foreground">Any promotions from competitors</p>
              </div>
              
              {/* Step 4: Orders */}
              <div className="flex flex-col">
                <div className={`h-2 rounded-full mb-2 ${activeStep === 'order-placement' || activeStep === 'completed' ? 'bg-[#7ccd57]' : 'bg-gray-200'}`}></div>
                <h3 className={`font-medium ${activeStep === 'order-placement' || activeStep === 'completed' ? 'text-[#7ccd57]' : ''}`}>Orders</h3>
                <p className="text-sm text-muted-foreground">Orders of stock that is depleted etc</p>
              </div>
            </div>
          </div>
          
          {/* Mobile only stepper - Shows only current step */}
          <div className="mb-6 md:hidden w-full">
            <div className="flex flex-col items-center w-full">
              {activeStep === 'stock-take' && (
                <>
                  <div className="h-2 w-full rounded-full mb-2 bg-[#7ccd57]"></div>
                  <h3 className="font-medium text-[#7ccd57]">Stock Take</h3>
                  <p className="text-sm text-muted-foreground text-center">Step 1 of
 4: Stock taking at shelf or Store</p>
                </>
              )}
              
              {activeStep === 'merchandising' && (
                <>
                  <div className="h-2 w-full rounded-full mb-2 bg-[#7ccd57]"></div>
                  <h3 className="font-medium text-[#7ccd57]">Merchandising</h3>
                  <p className="text-sm text-muted-foreground text-center">Step 2 of 4: Promotions for any of our products</p>
                </>
              )}
              
              {activeStep === 'competitor-analysis' && (
                <>
                  <div className="h-2 w-full rounded-full mb-2 bg-[#7ccd57]"></div>
                  <h3 className="font-medium text-[#7ccd57]">Competitor Promotions</h3>
                  <p className="text-sm text-muted-foreground text-center">Step 3 of 4: Any promotions from competitors</p>
                </>
              )}
              
              {activeStep === 'order-placement' && (
                <>
                  <div className="h-2 w-full rounded-full mb-2 bg-[#7ccd57]"></div>
                  <h3 className="font-medium text-[#7ccd57]">Orders</h3>
                  <p className="text-sm text-muted-foreground text-center">Step 4 of 4: Orders of stock that is depleted</p>
                </>
              )}
              
              {activeStep === 'completed' && (
                <>
                  <div className="h-2 w-32 rounded-full mb-2 bg-green-600"></div>
                  <h3 className="font-medium text-green-600">All Tasks Completed</h3>
                  <p className="text-sm text-muted-foreground text-center">You've successfully completed all required steps!</p>
                </>
              )}
            </div>
          </div>

          {/* Main form tabs */}
          {workItem.status === WorkItemStatus.COMPLETED ? (
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-6">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-semibold text-green-600 mb-3">Task Completed Successfully!</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Great job! This work item has been marked as complete and your inventory changes have been recorded.
                </p>
                <Button 
                  variant="default"
                  size="lg"
                  onClick={() => navigate("/my-assignments")}
                  className="mt-2"
                >
                  <ClipboardList className="mr-2 h-5 w-5" />
                  Return to My Assignments
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              {/* Just show the current step content based on activeStep */}
              
              {activeStep === "stock-take" && (
                <StockTakeSection 
                  storeId={storeId} 
                  workItemId={workItemId} 
                  navigate={navigate} 
                  setActiveStep={setActiveStep}
                  setLowStockItems={setLowStockItems}
                  setShowLowStockAlert={setShowLowStockAlert}
                  workItem={workItem}
                />
              )}
              
              {activeStep === "merchandising" && (
                <MerchandisingSection 
                  storeId={storeId} 
                  workItemId={workItemId} 
                  navigate={navigate} 
                  setActiveStep={setActiveStep}
                />
              )}
              
              {activeStep === "competitor-analysis" && (
                <CompetitorAnalysisSection 
                  storeId={storeId} 
                  workItemId={workItemId} 
                  navigate={navigate} 
                  setActiveStep={setActiveStep}
                />
              )}
              
              {activeStep === "order-placement" && (
                <OrderPlacementSection 
                  storeId={storeId} 
                  workItemId={workItemId} 
                  navigate={navigate} 
                  setActiveStep={setActiveStep}
                  lowStockItems={lowStockItems}
                />
              )}
              
              {/* Show completed screen if activeStep is "completed" or if work item is already in completed status */}
              {(activeStep === "completed" || (workItem && workItem.status === WorkItemStatus.COMPLETED)) && (
                <div className="text-center py-10">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-6">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  
                  {/* Different display for already-completed work items vs just completed ones */}
                  {workItem && workItem.status === WorkItemStatus.COMPLETED && activeStep !== "completed" ? (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 mx-auto max-w-lg text-left">
                        <div className="flex">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
                          <div>
                            <h3 className="font-medium text-green-800">Completed Work Item Summary</h3>
                            <p className="text-sm text-green-700">
                              You are viewing a completed work item in read-only mode.
                              {workItem.completedAt && (
                                <> This task was completed on {new Date(workItem.completedAt).toLocaleString()}.</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold mb-4">
                        Work Item Summary
                        <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">Completed</Badge>
                      </h2>
                    </>
                  ) : (
                    <h2 className="text-2xl font-bold mb-4">All Tasks Completed!</h2>
                  )}
                  <p className="text-lg mb-6 max-w-md mx-auto">
                    You've successfully completed all the required steps for this work item at {store.name}.
                  </p>
                  <Button 
                    size="lg" 
                    onClick={() => navigate("/my-assignments")}
                  >
                    Return to My Assignments
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/my-assignments")}>
            Cancel
          </Button>
          
          {workItem.status !== WorkItemStatus.COMPLETED && (
            <Button variant="destructive" onClick={() => setShowConfirmDialog(true)}>
              Cancel Task
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Confirmation dialog for canceling a task */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Task</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to cancel this task? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              No, Keep Task
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                try {
                  // Use the dedicated endpoint for updating status
                  await apiRequest("PUT", `/api/work-items/${workItemId}/status`, { 
                    status: WorkItemStatus.CANCELLED 
                  });
                  
                  queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
                  toast({
                    title: "Task canceled",
                    description: "The task has been canceled successfully",
                  });
                  
                  setShowConfirmDialog(false);
                  navigate("/my-assignments");
                } catch (error) {
                  console.error("Error canceling task:", error);
                  toast({
                    title: "Error",
                    description: "Failed to cancel the task",
                    variant: "destructive",
                  });
                }
              }}
            >
              Yes, Cancel Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Low Stock Alert Dialog */}
      <Dialog open={showLowStockAlert} onOpenChange={setShowLowStockAlert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="mb-3">
              The following items are below the minimum stock level threshold:
            </p>
            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
              {lowStockItems.map((item, index) => (
                <div key={`${item.product.id}-${item.location}-${index}`} className="flex justify-between items-center p-2 border-b last:border-b-0">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.location === 'shelf' ? 'Shelf' : 'Back Store'} - Current: <span className="text-destructive font-medium">{item.quantity}</span> / Min: {item.product.minStockLevel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowLowStockAlert(false)}
              className="sm:order-1"
            >
              Dismiss
            </Button>
            <Button 
              onClick={() => {
                setShowLowStockAlert(false);
                // Continue to the next step (merchandising) in the workflow
                setActiveStep("merchandising");
              }}
              className="w-full sm:w-auto gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Continue to Next Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};



export default ProcessForm;