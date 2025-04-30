import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Product, WorkItemStatus as WorkItemStatusEnum } from "@shared/schema";

// Type declarations for component props
type StockTakeSectionProps = {
  storeId: number;
  workItemId: number;
};

type MerchandisingSectionProps = {
  storeId: number;
  workItemId: number;
};

type CompetitorAnalysisSectionProps = {
  storeId: number;
  workItemId: number;
};

type OrderPlacementSectionProps = {
  storeId: number;
  workItemId: number;
};
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ClipboardList, ShoppingCart, BarChart, Tag, CheckCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { WorkItemStatus, WorkItemType } from "@shared/schema";

// Component for Stock Take section
const StockTakeSection = ({ storeId, workItemId }: StockTakeSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<{productId: number, quantity: number, location: string}[]>([]);
  const [pictures, setPictures] = useState<string[]>([]);
  const [comments, setComments] = useState("");
  const { toast } = useToast();
  
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!storeId,
  });
  
  const { data: stockTake } = useQuery({
    queryKey: ['/api/stores', storeId, 'stock-takes', 'active'],
    enabled: !!storeId,
  });
  
  const submitStockTake = async () => {
    setLoading(true);
    try {
      // Create or update stock take
      const stockTakeData = {
        storeId,
        comment: comments,
        pictures,
        status: "submitted", // Submit immediately
        items: stockData
      };
      
      await apiRequest("POST", "/api/stock-takes", stockTakeData);
      
      // Mark work item as completed
      await apiRequest("POST", `/api/work-items/${workItemId}/complete`);
      
      toast({
        title: "Stock take submitted",
        description: "Your stock take has been submitted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stores', storeId, 'stock-takes'] });
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
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <Label htmlFor="products">Product Inventory</Label>
        <div className="space-y-2">
          {products?.map((product) => (
            <div key={product.id} className="grid grid-cols-6 gap-2 items-center border p-2 rounded">
              <div className="col-span-3">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
              </div>
              <div className="col-span-2">
                <div className="flex space-x-2">
                  <Input 
                    type="number" 
                    placeholder="Shelf Qty" 
                    min="0"
                    onChange={(e) => {
                      const newStockData = [...stockData];
                      const existingIndex = newStockData.findIndex(
                        item => item.productId === product.id && item.location === "shelf"
                      );
                      
                      if (existingIndex >= 0) {
                        newStockData[existingIndex].quantity = parseInt(e.target.value) || 0;
                      } else {
                        newStockData.push({
                          productId: product.id,
                          quantity: parseInt(e.target.value) || 0,
                          location: "shelf"
                        });
                      }
                      
                      setStockData(newStockData);
                    }}
                  />
                  <Input 
                    type="number" 
                    placeholder="Back Qty" 
                    min="0"
                    onChange={(e) => {
                      const newStockData = [...stockData];
                      const existingIndex = newStockData.findIndex(
                        item => item.productId === product.id && item.location === "back_store"
                      );
                      
                      if (existingIndex >= 0) {
                        newStockData[existingIndex].quantity = parseInt(e.target.value) || 0;
                      } else {
                        newStockData.push({
                          productId: product.id,
                          quantity: parseInt(e.target.value) || 0,
                          location: "back_store"
                        });
                      }
                      
                      setStockData(newStockData);
                    }}
                  />
                </div>
              </div>
              <div className="col-span-1">
                {product.minStockLevel > 0 && (
                  <p className="text-xs text-gray-500">Min: {product.minStockLevel}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="pictures">Upload Pictures</Label>
        <Input id="pictures" type="file" multiple onChange={handleFileUpload} />
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
      
      <div className="space-y-2">
        <Label htmlFor="comments">Comments</Label>
        <Textarea 
          id="comments" 
          placeholder="Add any additional notes..." 
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
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
const MerchandisingSection = ({ storeId, workItemId }: MerchandisingSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [promotionPictures, setPromotionPictures] = useState<string[]>([]);
  const [promotionItems, setPromotionItems] = useState<{productId: number, price: number}[]>([]);
  const { toast } = useToast();
  
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!storeId,
  });
  
  const submitMerchandising = async () => {
    setLoading(true);
    try {
      // Create merchandising promotion
      const merchandisingData = {
        storeId,
        promotionPictures,
        items: promotionItems
      };
      
      await apiRequest("POST", "/api/merchandising", merchandisingData);
      
      // Mark work item as completed
      await apiRequest("POST", `/api/work-items/${workItemId}/complete`);
      
      toast({
        title: "Merchandising data submitted",
        description: "Your merchandising information has been submitted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
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
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <Label htmlFor="promotion-products">Promotion Products</Label>
        <div className="space-y-2">
          {products?.map((product) => (
            <div key={product.id} className="grid grid-cols-6 gap-2 items-center border p-2 rounded">
              <div className="col-span-3">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
              </div>
              <div className="col-span-2">
                <Input 
                  type="number" 
                  placeholder="Promotion Price (cents)" 
                  min="0"
                  onChange={(e) => {
                    const newItems = [...promotionItems];
                    const existingIndex = newItems.findIndex(item => item.productId === product.id);
                    
                    if (existingIndex >= 0) {
                      newItems[existingIndex].price = parseInt(e.target.value) || 0;
                    } else {
                      newItems.push({
                        productId: product.id,
                        price: parseInt(e.target.value) || 0
                      });
                    }
                    
                    setPromotionItems(newItems);
                  }}
                />
              </div>
              <div className="col-span-1">
                <p className="text-xs text-gray-500">Regular: {product.price}¢</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="promotion-pictures">Upload Promotion Pictures</Label>
        <Input id="promotion-pictures" type="file" multiple onChange={handleFileUpload} />
        {promotionPictures.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium">Selected files:</p>
            <ul className="list-disc pl-5 text-sm">
              {promotionPictures.map((pic, index) => (
                <li key={index}>{pic}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <Button 
        onClick={submitMerchandising} 
        disabled={loading || (promotionItems.length === 0 && promotionPictures.length === 0)}
        className="w-full"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Tag className="mr-2 h-4 w-4" />}
        Submit Merchandising Information
      </Button>
    </div>
  );
};

// Component for Competitor Analysis section
const CompetitorAnalysisSection = ({ storeId, workItemId }: CompetitorAnalysisSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [promotionalPrice, setPromotionalPrice] = useState<number | null>(null);
  const [pictures, setPictures] = useState<string[]>([]);
  const { toast } = useToast();
  
  const submitCompetitorAnalysis = async () => {
    setLoading(true);
    try {
      // Create competitor merchandising record
      const competitorData = {
        storeId,
        brand,
        productDescription,
        promotionalPrice: promotionalPrice || 0,
        promotionPictures: pictures
      };
      
      await apiRequest("POST", "/api/competitor-merchandising", competitorData);
      
      // Mark work item as completed
      await apiRequest("POST", `/api/work-items/${workItemId}/complete`);
      
      toast({
        title: "Competitor analysis submitted",
        description: "Your competitor analysis has been submitted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
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
        disabled={loading || !brand || !productDescription}
        className="w-full"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart className="mr-2 h-4 w-4" />}
        Submit Competitor Analysis
      </Button>
    </div>
  );
};

// Component for Order Placement section
const OrderPlacementSection = ({ storeId, workItemId }: OrderPlacementSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [pictures, setPictures] = useState<string[]>([]);
  const { toast } = useToast();
  
  const submitOrder = async () => {
    setLoading(true);
    try {
      // Create order
      const orderData = {
        storeId,
        notes,
        pictures,
        status: "submitted"
      };
      
      await apiRequest("POST", "/api/orders", orderData);
      
      // Mark work item as completed
      await apiRequest("POST", `/api/work-items/${workItemId}/complete`);
      
      toast({
        title: "Order submitted",
        description: "Your order has been submitted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
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
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="order-notes">Order Notes</Label>
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
        disabled={loading || !notes}
        className="w-full"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
        Submit Order
      </Button>
    </div>
  );
};

// Define types for our work items and stores
interface WorkItem {
  id: number;
  userId: number;
  title: string;
  status: string;
  dueDate?: string;
  storeId: number;
  type: string;
}

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
  
  // Fetch work item data
  const { 
    data: workItem, 
    isLoading: isLoadingWorkItem,
    error: workItemError 
  } = useQuery<WorkItem>({
    queryKey: ['/api/work-items', workItemId],
    enabled: !!workItemId,
  });
  
  // Fetch store data
  const {
    data: store,
    isLoading: isLoadingStore,
    error: storeError
  } = useQuery<Store>({
    queryKey: ['/api/stores', storeId],
    enabled: !!storeId,
  });
  
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
  
  // Handle starting the work item
  const handleStartWorkItem = async () => {
    if (workItem && workItem.status === WorkItemStatus.PENDING) {
      try {
        // Use the dedicated endpoint for updating status
        await apiRequest("PUT", `/api/work-items/${workItemId}/status`, {
          status: WorkItemStatus.IN_PROGRESS
        });
        
        // Manually invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
        queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
        
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
          // Try to fetch the work item to get its storeId
          const response = await fetch(`/api/work-items/${workItemId}`);
          if (response.ok) {
            const workItemData = await response.json();
            if (workItemData && workItemData.storeId) {
              console.log(`Found storeId ${workItemData.storeId} for workItemId ${workItemId}`);
              // Redirect with both parameters
              navigate(`/process-form?workItemId=${workItemId}&storeId=${workItemData.storeId}`);
              return;
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
  
  // Check if the user is assigned to this work item with improved user message and logging
  if (workItem.userId !== user?.id && user?.role !== 'admin' && user?.role !== 'manager') {
    console.log(`Access denied: User ${user?.id} (${user?.username}) tried to access work item ${workItem.id} which is assigned to user ${workItem.userId}`);
    
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
              <p className="mb-3">You are not assigned to this work item.</p>
              <p className="text-sm text-muted-foreground mb-3">
                This work may be assigned to another team member or you might need specific permissions.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Please check your assignments list or contact your manager if you believe this is a mistake.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  variant="default" 
                  onClick={() => navigate("/my-assignments")}
                >
                  View My Assignments
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Process Form</CardTitle>
              <CardDescription>
                Store: {store.name} | {store.location}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate("/my-assignments")}
            >
              Back to Assignments
            </Button>
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
                  {workItem.status.charAt(0).toUpperCase() + workItem.status.slice(1).replace('_', ' ')}
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
          
          {/* Progress stepper */}
          <div className="mb-8">
            <div className="grid grid-cols-4 gap-4">
              {/* Step 1: Stock Take */}
              <div className="flex flex-col">
                <div className={`h-2 rounded-full mb-2 ${activeStep === 'stock-take' || activeStep === 'merchandising' || activeStep === 'competitor' || activeStep === 'order' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <h3 className={`font-medium ${activeStep === 'stock-take' || activeStep === 'merchandising' || activeStep === 'competitor' || activeStep === 'order' ? 'text-blue-600' : ''}`}>Stock Take</h3>
                <p className="text-sm text-muted-foreground">Stock taking at shelf or Store</p>
              </div>
              
              {/* Step 2: Merchandising */}
              <div className="flex flex-col">
                <div className={`h-2 rounded-full mb-2 ${activeStep === 'merchandising' || activeStep === 'competitor' || activeStep === 'order' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <h3 className={`font-medium ${activeStep === 'merchandising' || activeStep === 'competitor' || activeStep === 'order' ? 'text-blue-600' : ''}`}>Merchandising</h3>
                <p className="text-sm text-muted-foreground">Promotions for any of our products</p>
              </div>
              
              {/* Step 3: Competitor Promotions */}
              <div className="flex flex-col">
                <div className={`h-2 rounded-full mb-2 ${activeStep === 'competitor' || activeStep === 'order' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <h3 className={`font-medium ${activeStep === 'competitor' || activeStep === 'order' ? 'text-blue-600' : ''}`}>Competitor Promotions</h3>
                <p className="text-sm text-muted-foreground">Any promotions from competitors</p>
              </div>
              
              {/* Step 4: Orders */}
              <div className="flex flex-col">
                <div className={`h-2 rounded-full mb-2 ${activeStep === 'order' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <h3 className={`font-medium ${activeStep === 'order' ? 'text-blue-600' : ''}`}>Orders</h3>
                <p className="text-sm text-muted-foreground">Orders of stock that is depleted etc</p>
              </div>
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
            <Tabs defaultValue="stock-take" onValueChange={(value) => {
              // Update active step in state
              setActiveStep(value);
            }}>
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="stock-take">Stock Take</TabsTrigger>
                <TabsTrigger value="merchandising">Merchandising</TabsTrigger>
                <TabsTrigger value="competitor">Competitor</TabsTrigger>
                <TabsTrigger value="order">Order</TabsTrigger>
              </TabsList>
              
              <TabsContent value="stock-take">
                <StockTakeSection storeId={storeId} workItemId={workItemId} />
              </TabsContent>
              
              <TabsContent value="merchandising">
                <MerchandisingSection storeId={storeId} workItemId={workItemId} />
              </TabsContent>
              
              <TabsContent value="competitor">
                <CompetitorAnalysisSection storeId={storeId} workItemId={workItemId} />
              </TabsContent>
              
              <TabsContent value="order">
                <OrderPlacementSection storeId={storeId} workItemId={workItemId} />
              </TabsContent>
            </Tabs>
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
    </div>
  );
};

export default ProcessForm;