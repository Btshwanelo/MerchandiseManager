import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from "@/components/ui/tabs";
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
  ArrowLeft,
  Loader2, 
  Calendar,
  Clock,
  Store,
  User,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Check,
  History,
  Info,
  MessageSquare,
  ClipboardCheck,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
  ShoppingCart,
  BarChart,
  Plus,
  XSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { WorkItemStatus, WorkItemType, UserRole, StockLocation } from "@shared/schema";

// Define types for our data
type User = {
  id: number;
  username: string;
  name: string;
  role: string;
};

type Store = {
  id: number;
  name: string;
  location: string;
};

type WorkItem = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  userId: number;
  storeId: number;
  storeAssignmentId: number;
  dueDate: string;
  priority: string;
  status: string;
  completedAt: string | null;
  notes: string | null;
  attachments: string[];
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
  store?: Store;
  creator?: User;
  auditTrail?: AuditEntry[];
};

type AuditEntry = {
  id: number;
  workItemId: number;
  userId: number;
  action: string;
  timestamp: string;
  previousStatus?: string;
  newStatus?: string;
  comment?: string;
  user?: User;
};

type StockTakeItem = {
  productId: number;
  quantity: number;
  location: StockLocation;
  product?: {
    id: number;
    name: string;
    sku: string;
    category: string;
  };
};

type StockTake = {
  id: number;
  storeId: number;
  userId: number;
  date: string;
  status: string;
  comment: string;
  pictures: string[];
  workItemId: number;
  items: StockTakeItem[];
  store?: Store;
  user?: User;
};

type MerchandisingItem = {
  productId: number;
  price: number;
  notes: string;
  product?: {
    id: number;
    name: string;
    sku: string;
    category: string;
  };
};

type Merchandising = {
  id: number;
  storeId: number;
  userId: number;
  date: string;
  workItemId: number;
  merchandisingItems: MerchandisingItem[];
  store?: Store;
  user?: User;
};

type Order = {
  id: number;
  storeId: number;
  userId: number;
  date: string;
  status: string;
  workItemId: number;
  orderItems: {
    productId: number;
    quantity: number;
    product?: {
      id: number;
      name: string;
      sku: string;
      category: string;
    };
  }[];
  store?: Store;
  user?: User;
};

type CompetitorMerchandising = {
  id: number;
  storeId: number;
  userId: number;
  date: string;
  workItemId: number;
  competitorName: string;
  items: {
    productId: number;
    price: number;
    notes: string;
    product?: {
      id: number;
      name: string;
      sku: string;
      category: string;
    };
  }[];
  store?: Store;
  user?: User;
};

const WorkItemDetailPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute<{ id: string }>("/work-item-detail/:id");
  const workItemId = parseInt(params?.id || "0");
  const [activeTab, setActiveTab] = useState("details");
  const [auditCommentDialogOpen, setAuditCommentDialogOpen] = useState(false);
  const [auditComment, setAuditComment] = useState("");

  // Fetch work item details
  const { 
    data: workItem, 
    isLoading: isLoadingWorkItem,
    error: workItemError,
    refetch: refetchWorkItem
  } = useQuery<WorkItem>({
    queryKey: [`/api/work-items/${workItemId}`],
    enabled: !!user && !!workItemId && user.role === UserRole.ADMIN
  });

  // Fetch related stock take data if it exists
  const { 
    data: stockTake,
    isLoading: isLoadingStockTake
  } = useQuery<StockTake>({
    queryKey: [`/api/stock-takes/by-work-item/${workItemId}`],
    enabled: !!workItem && !!workItemId
  });

  // Fetch related merchandising data if it exists
  const { 
    data: merchandising,
    isLoading: isLoadingMerchandising
  } = useQuery<Merchandising>({
    queryKey: [`/api/merchandising/by-work-item/${workItemId}`],
    enabled: !!workItem && !!workItemId
  });

  // Fetch related competitor merchandising data if it exists
  const { 
    data: competitorMerchandising,
    isLoading: isLoadingCompetitorMerchandising
  } = useQuery<CompetitorMerchandising>({
    queryKey: [`/api/competitor-merchandising/by-work-item/${workItemId}`],
    enabled: !!workItem && !!workItemId
  });

  // Fetch related order data if it exists
  const { 
    data: order,
    isLoading: isLoadingOrder
  } = useQuery<Order>({
    queryKey: [`/api/orders/by-work-item/${workItemId}`],
    enabled: !!workItem && !!workItemId
  });

  // Fetch audit trail for this work item
  const { 
    data: auditTrail = [],
    isLoading: isLoadingAuditTrail
  } = useQuery<AuditEntry[]>({
    queryKey: [`/api/work-items/${workItemId}/audit`],
    enabled: !!workItem && !!workItemId
  });

  // Mutation for editing work item with audit comment
  const editWorkItemMutation = useMutation({
    mutationFn: async ({ id, status, comment }: { id: number; status: string; comment: string }) => {
      // Include the admin's audit comment when making changes
      const res = await apiRequest("PATCH", `/api/work-items/${id}`, { 
        status, 
        auditComment: comment
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Work item updated successfully",
      });
      setAuditCommentDialogOpen(false);
      setAuditComment("");
      refetchWorkItem();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update work item: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
      case WorkItemStatus.COMPLETED:
        return "success";
      case WorkItemStatus.IN_PROGRESS:
        return "warning";
      case WorkItemStatus.PENDING:
        return "outline";
      case WorkItemStatus.CANCELLED:
        return "destructive";
      default:
        return "outline";
    }
  };

  // Get the appropriate icon for the work item type
  const getWorkItemTypeIcon = (type: string) => {
    switch(type) {
      case WorkItemType.STOCK_TAKE:
        return <ClipboardCheck className="h-5 w-5" />;
      case WorkItemType.INVENTORY_COUNT:
        return <ClipboardCheck className="h-5 w-5" />;
      case WorkItemType.MERCHANDISING:
        return <Store className="h-5 w-5" />;
      case WorkItemType.ORDER_PLACEMENT:
        return <ShoppingCart className="h-5 w-5" />;
      case WorkItemType.PROCESS_FORM:
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  // Determine if data loading is in progress
  const isLoading = isLoadingWorkItem || isLoadingStockTake || 
                   isLoadingMerchandising || isLoadingCompetitorMerchandising || 
                   isLoadingOrder || isLoadingAuditTrail;

  // Handle admin edit actions
  const handleAdminAction = (newStatus: string) => {
    setAuditComment("");
    setAuditCommentDialogOpen(true);
  };

  // Submit the edit with audit comment
  const submitEdit = () => {
    if (!auditComment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a comment explaining your changes.",
        variant: "destructive",
      });
      return;
    }

    if (!workItem) return;

    editWorkItemMutation.mutate({
      id: workItem.id,
      status: workItem.status, // Not changing status, just adding comment
      comment: auditComment
    });
  };

  // Handle back button
  const handleBack = () => {
    setLocation("/work-items");
  };

  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
              <p className="text-muted-foreground">
                Only administrators can access this page.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setLocation("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingWorkItem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (workItemError || !workItem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <CardTitle>Error Loading Work Item</CardTitle>
              <p className="text-muted-foreground">
                The requested work item could not be found or you don't have permission to view it.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setLocation("/work-items")}
              >
                Back to Work Items
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBack}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Work Items
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{workItem.title}</h1>
          <div className="flex items-center mt-1">
            <Badge variant={getStatusBadgeVariant(workItem.status)} className="mr-2">
              {workItem.status}
            </Badge>
            <Badge variant="outline">
              {workItem.type.replace(/_/g, ' ').toLowerCase()}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">
            <Info className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
          <TabsTrigger value="process-data">
            <FileText className="h-4 w-4 mr-2" />
            Process Data
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4 mr-2" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Work Item Details</CardTitle>
              <CardDescription>
                Basic information about this work item
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Title</h3>
                    <p className="font-medium">{workItem.title}</p>
                  </div>
                  
                  {workItem.description && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                      <p>{workItem.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Store</h3>
                    <div className="flex items-center">
                      <Store className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{workItem.store?.name || `Store #${workItem.storeId}`}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Assigned To</h3>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{workItem.user?.name || `User #${workItem.userId}`}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                    <Badge variant={getStatusBadgeVariant(workItem.status)} className="capitalize">
                      {workItem.status}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Due Date</h3>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{formatDate(workItem.dueDate)}</span>
                    </div>
                  </div>
                  
                  {workItem.completedAt && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Completed At</h3>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{formatDate(workItem.completedAt)}</span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Created By</h3>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{workItem.creator?.name || `Admin #${workItem.createdBy}`}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Created At</h3>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{formatDate(workItem.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {workItem.notes && (
                <div className="pt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                  <div className="bg-muted p-4 rounded-md">
                    {workItem.notes}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => handleAdminAction(workItem.status)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Add Admin Comment
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Process Data Tab */}
        <TabsContent value="process-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Process Form Data</CardTitle>
              <CardDescription>
                Data submitted through the process form
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWorkItem || isLoadingStockTake || isLoadingMerchandising || 
                isLoadingCompetitorMerchandising || isLoadingOrder ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !stockTake && !merchandising && !competitorMerchandising && !order ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No process data found for this work item.</p>
                </div>
              ) : (
                <Tabs 
                  defaultValue={
                    stockTake 
                      ? "stock-take" 
                      : merchandising 
                        ? "merchandising" 
                        : competitorMerchandising 
                          ? "competitor" 
                          : "order"
                  } 
                  className="w-full"
                >
                  <TabsList className="mb-4">
                    {/* Always show Stock Take tab */}
                    <TabsTrigger value="stock-take">
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Stock Take
                    </TabsTrigger>
                    
                    {/* Always show Merchandising tab */}
                    <TabsTrigger value="merchandising">
                      <Store className="h-4 w-4 mr-2" />
                      Merchandising
                    </TabsTrigger>
                    
                    {/* Always show Competitor Analysis tab */}
                    <TabsTrigger value="competitor">
                      <BarChart className="h-4 w-4 mr-2" />
                      Competitor
                    </TabsTrigger>
                    
                    {/* Always show Order tab */}
                    <TabsTrigger value="order">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Order
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Stock Take Tab */}
                  <TabsContent value="stock-take" className="space-y-4">
                    {stockTake ? (
                      <>
                        <div className="bg-muted p-4 rounded-md">
                          <h3 className="font-medium mb-2">Stock Take Info</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-muted-foreground">Date:</span>
                            <span>{formatDate(stockTake.date)}</span>
                            
                            <span className="text-muted-foreground">Status:</span>
                            <span className="capitalize">{stockTake.status}</span>
                            
                            <span className="text-muted-foreground">Total Items:</span>
                            <span>{stockTake.items?.length || 0}</span>
                          </div>
                        </div>
                        
                        {stockTake.comment && (
                          <div className="bg-muted p-4 rounded-md">
                            <h3 className="font-medium mb-2">Merchandiser Comment</h3>
                            <p className="text-sm">{stockTake.comment}</p>
                          </div>
                        )}
                        
                        {stockTake.items && stockTake.items.length > 0 && (
                          <div>
                            <h3 className="font-medium mb-2">Stock Take Items</h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Location</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {stockTake.items.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      {item.product?.name || `Product #${item.productId}`}
                                    </TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell className="capitalize">
                                      {item.location.replace('_', ' ')}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        
                        {stockTake.pictures && stockTake.pictures.length > 0 && (
                          <div>
                            <h3 className="font-medium mb-2">Pictures</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {stockTake.pictures.map((pic, index) => (
                                <div key={index} className="aspect-square bg-muted rounded-md flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ClipboardX className="h-12 w-12 mx-auto mb-4 text-muted" />
                        <h3 className="text-lg font-medium mb-2">No Stock Take Data</h3>
                        <p>This work item does not have any stock take data submitted.</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* Merchandising Tab */}
                  <TabsContent value="merchandising" className="space-y-4">
                    {merchandising ? (
                      <>
                        <div className="bg-muted p-4 rounded-md">
                          <h3 className="font-medium mb-2">Merchandising Info</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-muted-foreground">Date:</span>
                            <span>{formatDate(merchandising.date)}</span>
                            
                            <span className="text-muted-foreground">Total Items:</span>
                            <span>{merchandising.merchandisingItems?.length || 0}</span>
                          </div>
                        </div>
                        
                        {merchandising.merchandisingItems && merchandising.merchandisingItems.length > 0 && (
                          <div>
                            <h3 className="font-medium mb-2">Merchandising Items</h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>Notes</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {merchandising.merchandisingItems.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      {item.product?.name || `Product #${item.productId}`}
                                    </TableCell>
                                    <TableCell>R{item.price.toFixed(2)}</TableCell>
                                    <TableCell>{item.notes || '-'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Store className="h-12 w-12 mx-auto mb-4 text-muted" />
                        <h3 className="text-lg font-medium mb-2">No Merchandising Data</h3>
                        <p>This work item does not have any merchandising data submitted.</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* Competitor Tab */}
                  {competitorMerchandising && (
                    <TabsContent value="competitor" className="space-y-4">
                      <div className="bg-muted p-4 rounded-md">
                        <h3 className="font-medium mb-2">Competitor Merchandising Info</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">Date:</span>
                          <span>{formatDate(competitorMerchandising.date)}</span>
                          
                          <span className="text-muted-foreground">Competitor:</span>
                          <span>{competitorMerchandising.competitorName}</span>
                          
                          <span className="text-muted-foreground">Total Items:</span>
                          <span>{competitorMerchandising.items?.length || 0}</span>
                        </div>
                      </div>
                      
                      {competitorMerchandising.items && competitorMerchandising.items.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-2">Competitor Products</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {competitorMerchandising.items.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    {item.product?.name || `Product #${item.productId}`}
                                  </TableCell>
                                  <TableCell>R{item.price.toFixed(2)}</TableCell>
                                  <TableCell>{item.notes || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  )}
                  
                  {/* Order Tab */}
                  {order && (
                    <TabsContent value="order" className="space-y-4">
                      <div className="bg-muted p-4 rounded-md">
                        <h3 className="font-medium mb-2">Order Info</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">Date:</span>
                          <span>{formatDate(order.date)}</span>
                          
                          <span className="text-muted-foreground">Status:</span>
                          <span className="capitalize">{order.status}</span>
                          
                          <span className="text-muted-foreground">Total Items:</span>
                          <span>{order.orderItems?.length || 0}</span>
                        </div>
                      </div>
                      
                      {order.orderItems && order.orderItems.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-2">Order Items</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Quantity</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.orderItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    {item.product?.name || `Product #${item.productId}`}
                                  </TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  )}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                History of changes and comments for this work item
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAuditTrail ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !auditTrail || auditTrail.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No audit trail found for this work item.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute top-0 bottom-0 left-4 w-0.5 bg-muted"></div>
                    <ul className="space-y-6">
                      {auditTrail.map((entry, index) => (
                        <li key={index} className="relative pl-10">
                          <div className="absolute left-0 rounded-full h-8 w-8 flex items-center justify-center bg-muted">
                            {entry.action === 'created' && <Plus className="h-4 w-4 text-green-500" />}
                            {entry.action === 'updated' && <Edit className="h-4 w-4 text-amber-500" />}
                            {entry.action === 'completed' && <Check className="h-4 w-4 text-green-500" />}
                            {entry.action === 'commented' && <MessageSquare className="h-4 w-4 text-blue-500" />}
                            {entry.action === 'approved' && <ThumbsUp className="h-4 w-4 text-green-500" />}
                            {entry.action === 'rejected' && <ThumbsDown className="h-4 w-4 text-red-500" />}
                          </div>
                          <div className="bg-card border rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-medium capitalize">{entry.action}</span>
                                <span className="text-muted-foreground ml-2 text-sm">
                                  by {entry.user?.name || `User #${entry.userId}`}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatDate(entry.timestamp)}
                              </div>
                            </div>
                            
                            {entry.previousStatus && entry.newStatus && (
                              <div className="text-sm mb-2">
                                <span className="text-muted-foreground">Status changed from </span>
                                <Badge variant="outline" className="mr-1 capitalize">
                                  {entry.previousStatus}
                                </Badge>
                                <span className="text-muted-foreground">to </span>
                                <Badge variant={getStatusBadgeVariant(entry.newStatus)} className="capitalize">
                                  {entry.newStatus}
                                </Badge>
                              </div>
                            )}
                            
                            {entry.comment && (
                              <div className="bg-muted p-3 rounded-md mt-2 text-sm">
                                {entry.comment}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Audit Comment Dialog */}
      <Dialog open={auditCommentDialogOpen} onOpenChange={setAuditCommentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Admin Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="auditComment" className="text-sm font-medium">
                Comment
              </label>
              <Textarea
                id="auditComment"
                placeholder="Enter a comment explaining your changes"
                value={auditComment}
                onChange={(e) => setAuditComment(e.target.value)}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Your comment will be recorded in the audit trail.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAuditCommentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitEdit}
              disabled={editWorkItemMutation.isPending}
            >
              {editWorkItemMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Submit Comment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkItemDetailPage;