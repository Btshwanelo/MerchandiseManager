import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Combobox } from "@/components/ui/combobox";
import { 
  Loader2, 
  Store, 
  Camera, 
  Save, 
  File, 
  ShoppingCart, 
  Clock, 
  Check, 
  X, 
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Order, Store as StoreType, UserRole } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

const OrdersPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [fileUploads, setFileUploads] = useState<File[]>([]);
  const [imagePreviewDialogOpen, setImagePreviewDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewOrderDialogOpen, setViewOrderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Fetch stores
  const { data: stores, isLoading: isLoadingStores } = useQuery<StoreType[]>({
    queryKey: ["/api/stores"],
  });

  // Fetch orders
  const { data: orders, isLoading, error, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/orders", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order submitted",
        description: "The order has been successfully submitted.",
      });
      // Reset form
      setSelectedStore("");
      setNotes("");
      setFileUploads([]);
    },
    onError: (error) => {
      toast({
        title: "Failed to submit order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  // Submit order
  const handleSubmitOrder = () => {
    if (!selectedStore) {
      toast({
        title: "Store required",
        description: "Please select a store for this order.",
        variant: "destructive"
      });
      return;
    }

    if (fileUploads.length === 0) {
      toast({
        title: "Images required",
        description: "Please upload at least one picture of the order.",
        variant: "destructive"
      });
      return;
    }

    // In a real implementation, we would upload the images to a storage service
    // and then submit the form data with the image URLs
    // For this prototype, we're just simulating the process

    const formData = new FormData();
    formData.append("storeId", selectedStore);
    formData.append("notes", notes);
    
    fileUploads.forEach(file => {
      formData.append("pictures", file);
    });

    createOrderMutation.mutate(formData);
  };

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number, status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order updated",
        description: "The order status has been successfully updated.",
      });
      setViewOrderDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve order 
  const handleApproveOrder = (orderId: number) => {
    updateOrderStatusMutation.mutate({ orderId, status: "processing" });
  };

  // Complete order
  const handleCompleteOrder = (orderId: number) => {
    updateOrderStatusMutation.mutate({ orderId, status: "completed" });
  };

  // Reject order
  const handleRejectOrder = (orderId: number) => {
    updateOrderStatusMutation.mutate({ orderId, status: "cancelled" });
  };

  // View order details
  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setViewOrderDialogOpen(true);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-primary text-primary-foreground">Submitted</Badge>;
      case "processing":
        return <Badge className="bg-orange-500 text-white">Processing</Badge>;
      case "completed":
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive text-destructive-foreground">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Button 
          onClick={handleSubmitOrder}
          disabled={createOrderMutation.isPending}
        >
          {createOrderMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Submit Order
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New Order</CardTitle>
              <CardDescription>
                Take pictures and submit orders for processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Store</label>
                  <Combobox
                    value={selectedStore}
                    onChange={setSelectedStore}
                    placeholder="Select a store..."
                    loading={isLoadingStores}
                    emptyMessage={
                      isLoadingStores 
                        ? "Loading stores..." 
                        : stores?.length === 0 
                          ? "No stores available" 
                          : "No stores found"
                    }
                    options={
                      stores?.map((store) => ({
                        label: `${store.name} - ${store.location}`,
                        value: store.id.toString()
                      })) || []
                    }
                    renderItem={(option) => (
                      <div className="flex items-center">
                        <Store className="h-4 w-4 mr-2 text-muted-foreground" />
                        {option.label}
                      </div>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Textarea 
                    placeholder="Enter any notes about this order..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Order Images</label>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md flex items-center text-sm">
                        <Camera className="h-4 w-4 mr-2" />
                        Add Photos
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

                  {fileUploads.length === 0 ? (
                    <div className="border-2 border-dashed rounded-md p-8 flex flex-col items-center justify-center text-center">
                      <ShoppingCart className="h-8 w-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">No order images uploaded yet</p>
                      <p className="text-xs text-muted-foreground">
                        Take pictures of your order and upload them here
                      </p>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="py-8 text-center text-destructive">
                  Error loading orders. Please try again.
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Using mock data until API is connected */}
                      {[
                        {
                          id: 1,
                          storeId: 1,
                          orderDate: new Date(new Date().setDate(new Date().getDate() - 1)),
                          status: "completed",
                          pictures: ["order1.jpg"],
                          storeName: "Downtown Store"
                        },
                        {
                          id: 2,
                          storeId: 2,
                          orderDate: new Date(new Date().setDate(new Date().getDate() - 3)),
                          status: "processing",
                          pictures: ["order2.jpg", "order2-2.jpg"],
                          storeName: "Westside Mall"
                        },
                        {
                          id: 3,
                          storeId: 3,
                          orderDate: new Date(new Date().setDate(new Date().getDate() - 5)),
                          status: "submitted",
                          pictures: ["order3.jpg"],
                          storeName: "North Shopping Center"
                        }
                      ].map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>ORD-{order.id.toString().padStart(4, '0')}</TableCell>
                          <TableCell>{order.storeName}</TableCell>
                          <TableCell>{order.orderDate.toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Store Selected</span>
                  <span className="font-medium">
                    {selectedStore ? stores?.find(s => s.id.toString() === selectedStore)?.name : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Images Uploaded</span>
                  <span className="font-medium">{fileUploads.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Notes Added</span>
                  <span className="font-medium">{notes.trim() ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className="bg-muted/20 p-4 rounded-md">
                <h4 className="font-medium mb-3">Order Process</h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">Take Photos</p>
                      <p className="text-xs text-muted-foreground">
                        Upload images of your order
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-50">
                        <Clock className="h-3 w-3" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-muted-foreground">Submit Order</p>
                      <p className="text-xs text-muted-foreground">
                        Send the order for processing
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="bg-muted text-muted-foreground rounded-full w-5 h-5 flex items-center justify-center">
                        <Clock className="h-3 w-3" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-muted-foreground">Order Processed</p>
                      <p className="text-xs text-muted-foreground">
                        Order is reviewed and processed
                      </p>
                    </div>
                  </div>
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

      {/* View Order Dialog */}
      <Dialog open={viewOrderDialogOpen} onOpenChange={setViewOrderDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-medium">ORD-{selectedOrder.id.toString().padStart(4, '0')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Store</p>
                  <p className="font-medium">{selectedOrder.storeName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedOrder.orderDate.toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Order Images</p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedOrder.pictures.map((pic: string, index: number) => (
                    <div key={index} className="aspect-square bg-muted rounded-md flex items-center justify-center">
                      <div className="text-center">
                        <File className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{pic}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <p className="text-sm font-medium">Timeline</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="bg-primary rounded-full w-2 h-2"></div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">Order Submitted</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedOrder.orderDate.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {selectedOrder.status === "processing" || selectedOrder.status === "completed" ? (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="bg-orange-500 rounded-full w-2 h-2"></div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">Processing Started</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedOrder.orderDate.getTime() + 86400000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  
                  {selectedOrder.status === "completed" ? (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="bg-success rounded-full w-2 h-2"></div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">Order Completed</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedOrder.orderDate.getTime() + 172800000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              
              {/* Order images */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Order Images</p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedOrder.pictures && selectedOrder.pictures.map((pic: string, index: number) => (
                    <div key={index} className="border rounded-md h-20 bg-muted/20 flex items-center justify-center overflow-hidden">
                      <img src={pic} alt={`Order ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Management controls for admins and managers */}
              {user && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && selectedOrder.status === "submitted" && (
                <div className="mt-6 bg-muted/20 rounded-md p-4 space-y-3">
                  <h4 className="font-medium text-sm">Order Management</h4>
                  <p className="text-xs text-muted-foreground">As a manager or admin, you can approve or reject this order.</p>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => handleApproveOrder(selectedOrder.id)}
                      disabled={updateOrderStatusMutation.isPending}
                    >
                      {updateOrderStatusMutation.isPending ? 
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 
                        <Check className="h-4 w-4 mr-1" />
                      }
                      Approve Order
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleRejectOrder(selectedOrder.id)}
                      disabled={updateOrderStatusMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject Order
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Complete order button for processing orders */}
              {user && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && selectedOrder.status === "processing" && (
                <div className="mt-6 bg-muted/20 rounded-md p-4 space-y-3">
                  <h4 className="font-medium text-sm">Order Processing</h4>
                  <p className="text-xs text-muted-foreground">Mark this order as completed when it has been fulfilled.</p>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => handleCompleteOrder(selectedOrder.id)}
                      disabled={updateOrderStatusMutation.isPending}
                      className="bg-success hover:bg-success/90"
                    >
                      {updateOrderStatusMutation.isPending ? 
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 
                        <Check className="h-4 w-4 mr-1" />
                      }
                      Mark as Completed
                    </Button>
                  </div>
                </div>
              )}
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

export default OrdersPage;