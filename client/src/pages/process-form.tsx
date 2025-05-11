import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Product, 
  WorkItemStatus, 
  WorkItemType,
  StockTakeType, 
  StockTake, 
  StockTakeItem, 
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
  Package
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
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// Using StockTake from shared schema instead of defining it locally

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
const StockTakeSection = ({ storeId, workItemId, navigate, setActiveStep, setLowStockItems, setShowLowStockAlert }: StockTakeSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<{productId: number, quantity: number, location: string}[]>([]);
  const [pictures, setPictures] = useState<string[]>([]);
  // Add state for individual image uploads (8 placeholders)
  const [shelfImages, setShelfImages] = useState<Array<string | null>>(Array(8).fill(null));
  const [comments, setComments] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<string>("0");
  const [stockTakeStatus, setStockTakeStatus] = useState<string>("draft");
  const { toast } = useToast();
  
  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!storeId,
  });
  
  // Fetch store assignment to get stockTakeType
  const { data: workItem } = useQuery<WorkItem>({
    queryKey: ['/api/work-items', workItemId],
    enabled: !!workItemId,
  });
  
  // Fetch existing stock take for this store and work item
  const { data: stockTake } = useQuery<StockTake>({
    queryKey: ['/api/stock-takes/by-work-item', workItemId?.toString()],
    enabled: !!workItemId && !!storeId,
  });
  
  // Update status when stock take data changes
  useEffect(() => {
    if (stockTake?.status) {
      setStockTakeStatus(stockTake.status);
    }
  }, [stockTake]);
  
  // Fetch store assignment to get stockTakeType
  const { data: storeAssignment } = useQuery<StoreAssignment>({
    queryKey: ['/api/assignments', workItem?.storeAssignmentId],
    enabled: !!workItem?.storeAssignmentId,
  });
  
  // Determine stock take type from store assignment
  const stockTakeType = storeAssignment?.stockTakeType || 'both';
  
  const submitStockTake = async () => {
    setLoading(true);
    try {
      // Combine the individual shelf images with any legacy pictures
      const allImages = [
        ...shelfImages.filter(Boolean), // Filter out null values
        ...pictures.filter(pic => !shelfImages.includes(pic)) // Add any pictures not in shelfImages
      ];
      
      // Create or update stock take
      const stockTakeData = {
        storeId,
        comment: comments,
        pictures: allImages,
        status: "submitted", // Submit immediately
        items: JSON.stringify(stockData), // Convert to string as expected by server
        workItemId // Include workItemId so server can mark it as completed
      };
      
      const response = await apiRequest("POST", "/api/stock-takes", stockTakeData);
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
    // For demo, just store file names - in a real app, this would upload files
    const files = event.target.files;
    if (files && files.length > 0) {
      const newPictures = [...pictures];
      for (let i = 0; i < files.length; i++) {
        newPictures.push(files[i].name);
      }
      setPictures(newPictures);
    }
  };
  
  // Handle individual shelf image upload
  const handleShelfImageUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Create a new copy of the shelf images array
      const newShelfImages = [...shelfImages];
      // Store the file name (in a real app, this would be the file URL after upload)
      newShelfImages[index] = files[0].name;
      setShelfImages(newShelfImages);
      
      // Also add to the pictures array for backward compatibility
      setPictures(prev => [...prev, files[0].name]);
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
                  {option.label}
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
        </div>
        
        {/* No Products State */}
        {addedProducts.length === 0 ? (
          <div className="bg-muted/50 rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <ShoppingCart className="h-16 w-16 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium text-muted-foreground mb-2">No Products Added</h3>
            <p className="text-muted-foreground">Add products to your stock take using the form above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {addedProducts.map(item => (
              <div key={item?.product.id} className="bg-card border rounded-lg p-4">
                <div className="mb-2">
                  <h3 className="font-semibold">{item?.product.name}</h3>
                  <p className="text-sm text-muted-foreground">SKU: {item?.product.sku}</p>
                </div>
                
                <div className="grid gap-3">
                  {/* Show shelf quantity if applicable */}
                  {(stockTakeType === 'shelf' || stockTakeType === 'both') && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Shelf quantity:</span>
                      <span className="font-medium">{item?.shelfQuantity}</span>
                    </div>
                  )}
                  
                  {/* Show back store quantity if applicable */}
                  {(stockTakeType === 'store' || stockTakeType === 'both') && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Back store quantity:</span>
                      <span className="font-medium">{item?.backStoreQuantity}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Shelf Images Grid and Comments Section */}
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-medium">Upload Shelf Photos (up to 8)</Label>
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
                    {/* In a real app, this would be an actual image */}
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <img
                        src="#" // Placeholder, would be actual image URL in prod
                        alt={`Shelf image ${index + 1}`}
                        className="object-cover w-full h-full"
                        // Use Image component with empty src for demo
                        onError={(e) => {
                          e.currentTarget.src = "";
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <span className="text-sm text-center px-2 text-muted-foreground">
                        {shelfImages[index]}
                      </span>
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
          <p className="text-sm text-muted-foreground">Upload photos of the shelf to document the stock take</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="comments">Comments</Label>
          <Textarea 
            id="comments" 
            placeholder="Add any additional notes..." 
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>
      </div>
      
      <Button 
        onClick={submitStockTake} 
        disabled={loading || stockData.length === 0}
        className="w-full"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
        Submit Stock Take
      </Button>
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
                  {option.label}
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
      
      // Create competitor merchandising record
      const competitorData = {
        storeId,
        workItemId,
        brand,
        productDescription,
        price: promotionalPrice || undefined,
        date: new Date()
      };
      
      // Include pictures if available
      if (pictures.length > 0) {
        // @ts-ignore
        competitorData.pictureUrl = pictures.join(',');
      }
      
      const response = await apiRequest("POST", "/api/competitor-merchandising", competitorData);
      const result = await response.json();
      
      toast({
        title: "Competitor analysis submitted",
        description: "Your competitor analysis has been submitted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      
      // Move to the next step in the process
      setTimeout(() => {
        setActiveStep("order-placement");
      }, 1000);
    } catch (error) {
      console.error("Error submitting competitor analysis:", error);
      toast({
        title: "Error",
        description: "Failed to submit competitor analysis",
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
  
  // Fetch products and low stock data
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!storeId,
  });
  
  // Get stock take data to identify low stock items
  const { data: stockTakes = [] } = useQuery<StockTake[]>({
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
  
  const { data: stockTakeItems = [] } = useQuery<StockTakeItem[]>({
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
  
  const inventoryLowStockItems = getInventoryLowStockItems();
  
  // Add a low stock item to the order
  const addLowStockItem = (item: any) => {
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
  
  // Add all low stock items to the order at once
  const addAllLowStockItems = () => {
    if (lowStockItems.length === 0) return;
    
    // Create a map of existing order items by productId for quick lookup
    const existingItemsMap = new Map(
      orderItems.map(item => [item.productId, item])
    );
    
    // Process all low stock items
    const updatedOrderItems = [...orderItems];
    let addedCount = 0;
    let updatedCount = 0;
    
    lowStockItems.forEach(lowStockItem => {
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
          await apiRequest("PATCH", `/api/work-items/${workItemId}`, { 
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
        orderItems: orderItems
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
        await apiRequest("PATCH", `/api/work-items/${workItemId}`, { 
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
          {lowStockItems.length > 0 && (
            <Button 
              onClick={addAllLowStockItems} 
              variant="secondary" 
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" /> Add All to Order
            </Button>
          )}
        </div>
        
        {lowStockItems.length === 0 ? (
          <div className="text-center p-4 bg-muted rounded-md">
            <ShoppingBasket className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No low stock items detected.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lowStockItems.map((item) => (
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
                  onClick={() => addLowStockItem(item)} 
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
                  {option.label}
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
  useEffect(() => {
    if (workItem && workItem.status === WorkItemStatus.COMPLETED) {
      setActiveStep("completed");
    }
  }, [workItem]);
  
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
      const res = await apiRequest("PATCH", `/api/work-items/${id}`, { 
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
            </div>
            
            {workItem.status === WorkItemStatus.PENDING && (
              <Button onClick={handleStartWorkItem}>
                Start Work
              </Button>
            )}
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
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 mx-auto max-w-lg text-left">
                        <div className="flex">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
                          <div>
                            <h3 className="font-medium text-yellow-800">View Only Mode</h3>
                            <p className="text-sm text-yellow-700">
                              This work item has already been completed and is in read-only mode.
                              {workItem.completedAt && (
                                <> It was completed on {new Date(workItem.completedAt).toLocaleString()}.</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold mb-4">Work Item Completed</h2>
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
                // Navigate to the order placement step
                setActiveStep("order-placement");
              }}
              className="w-full sm:w-auto gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Place Order Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcessForm;