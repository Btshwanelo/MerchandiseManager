import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  DialogTrigger,
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
  Alert,
  AlertTitle,
  AlertDescription 
} from "@/components/ui/alert";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Loader2, 
  Save, 
  Store, 
  Camera, 
  Image,
  Edit,
  History,
  Check,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Product, 
  Store as StoreType, 
  StockLocation, 
  UserRole, 
  StockTake as DbStockTake, 
  StockTakeItem 
} from "@shared/schema";

// Define a type for StockTake that includes properties we know will be in our response
type StockTake = DbStockTake & {
  pictures: string[];
  items: (StockTakeItem & { product: Product })[];
};

// Define stock take edit form schema
const stockTakeEditSchema = z.object({
  comment: z.string().optional(),
  status: z.string(),
  auditComment: z.string().min(1, { message: "Audit comment is required when editing someone else's stock take" }).optional()
});

type StockTakeEditFormValues = z.infer<typeof stockTakeEditSchema>;

const StockTakeDetailPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/stock-take/:id");
  const stockTakeId = params?.id;
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreviewDialogOpen, setImagePreviewDialogOpen] = useState(false);
  
  // Determine if user is admin or manager
  const isAdminOrManager = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;
  
  // Fetch the stock take detail
  const { 
    data: stockTake, 
    isLoading: isLoadingStockTake,
    refetch: refetchStockTake
  } = useQuery<StockTake>({
    queryKey: [`/api/stock-takes/${stockTakeId}`],
    enabled: !!stockTakeId && !!user,
  });
  
  // Fetch stores for showing store name
  const { data: stores } = useQuery<StoreType[]>({
    queryKey: ["/api/stores"],
    enabled: !!user,
  });
  
  // Check if the current user is editing someone else's stock take
  const isEditingOthersStockTake = stockTake && user && stockTake.userId !== user.id;
  
  // Setup form for stock take editing
  const form = useForm<StockTakeEditFormValues>({
    resolver: zodResolver(
      isEditingOthersStockTake 
        ? stockTakeEditSchema
        : stockTakeEditSchema.omit({ auditComment: true })
    ),
    defaultValues: {
      comment: stockTake?.comment || '',
      status: stockTake?.status || 'completed',
      auditComment: ''
    }
  });
  
  // Update form values when stock take data is loaded
  useEffect(() => {
    if (stockTake) {
      form.reset({
        comment: stockTake.comment || '',
        status: stockTake.status || 'completed',
        auditComment: ''
      });
    }
  }, [stockTake, form]);
  
  // View an image in the preview dialog
  const handleViewImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImagePreviewDialogOpen(true);
  };
  
  // Update stock take mutation
  const updateStockTakeMutation = useMutation({
    mutationFn: async (data: StockTakeEditFormValues) => {
      // Create form data to handle the multipart/form-data submission
      const formData = new FormData();
      formData.append('comment', data.comment || '');
      formData.append('status', data.status);
      
      // Only include audit comment if required (admin/manager editing someone else's work)
      if (isEditingOthersStockTake && data.auditComment) {
        formData.append('auditComment', data.auditComment);
      }
      
      // Use fetch directly for better control over FormData
      const response = await fetch(`/api/stock-takes/${stockTakeId}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        let errorMessage = "Failed to update stock take";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, try to get text
          const errorText = await response.text().catch(() => "");
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch the stock take data
      queryClient.invalidateQueries({ queryKey: [`/api/stock-takes/${stockTakeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-takes"] });
      
      toast({
        title: "Stock take updated",
        description: "The stock take has been successfully updated."
      });
      
      // Exit edit mode
      setIsEditing(false);
      
      // Refetch the stock take to get the updated data
      refetchStockTake();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update stock take",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Form submission handler
  const onSubmit = (data: StockTakeEditFormValues) => {
    updateStockTakeMutation.mutate(data);
  };
  
  // Get store name from store ID
  const getStoreName = (storeId?: number) => {
    if (!storeId || !stores) return "Unknown Store";
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : `Store #${storeId}`;
  };
  
  // Format date for display
  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return "Unknown Date";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };
  
  if (isLoadingStockTake) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading stock take details...</span>
      </div>
    );
  }
  
  if (!stockTake) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Stock take not found or you don't have permission to view it. 
          <Button variant="link" className="p-0 h-auto font-normal" onClick={() => setLocation('/stock-take')}>
            Return to Stock Takes
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation('/stock-take')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Stock Take Details</h1>
        </div>
        {isAdminOrManager && !isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Stock Take
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Take Information</CardTitle>
              <CardDescription>
                Recorded on {formatDate(stockTake.date)} at {getStoreName(stockTake.storeId)}
              </CardDescription>
            </CardHeader>
            
            {isEditing ? (
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comments</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add comments about this stock take..." 
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {isEditingOthersStockTake && (
                      <FormField
                        control={form.control}
                        name="auditComment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-red-500">Audit Comment (Required)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Explain why you are editing this stock take..."
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={updateStockTakeMutation.isPending}
                      >
                        {updateStockTakeMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            ) : (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Store</h3>
                  <div className="flex items-center">
                    <Store className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{getStoreName(stockTake.storeId)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Status</h3>
                  <div>
                    <span className={
                      stockTake.status === 'completed' 
                        ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800' 
                        : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'
                    }>
                      <Check className="h-3 w-3 mr-1" />
                      {stockTake.status === 'completed' ? 'Completed' : 'Draft'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Comments</h3>
                  <p className="text-sm text-muted-foreground">{stockTake.comment || 'No comments'}</p>
                </div>
                
                {stockTake.auditComment && (
                  <div className="space-y-2 p-3 border border-amber-200 bg-amber-50 rounded-md">
                    <h3 className="text-sm font-medium flex items-center">
                      <History className="h-4 w-4 mr-2 text-amber-500" />
                      Audit Information
                    </h3>
                    <p className="text-sm">
                      <span className="font-medium">Last edited:</span> {formatDate(stockTake.lastEditedAt)}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Reason for edit:</span> {stockTake.auditComment}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Product Items</CardTitle>
              <CardDescription>
                Items recorded in this stock take
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stockTake.items?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Min Stock Level</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockTake.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell>{item.product.sku}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          {item.location === StockLocation.SHELF ? 'Shelf' : 'Back Store'}
                        </TableCell>
                        <TableCell>{item.product.minStockLevel}</TableCell>
                        <TableCell>
                          {item.quantity < item.product.minStockLevel ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              In Stock
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No products recorded in this stock take.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <CardDescription>
                Pictures taken during stock take
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stockTake.pictures && stockTake.pictures.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {stockTake.pictures.map((pic, index) => (
                    <div 
                      key={index} 
                      className="relative aspect-square rounded-md overflow-hidden cursor-pointer border"
                      onClick={() => handleViewImage(pic)}
                    >
                      <img 
                        src={pic} 
                        alt={`Stock take image ${index + 1}`} 
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Camera className="mx-auto h-10 w-10 opacity-20 mb-2" />
                  <p>No photos available for this stock take.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Image preview dialog */}
      <Dialog open={imagePreviewDialogOpen} onOpenChange={setImagePreviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Stock Take Photo</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Stock take detailed view" 
                className="max-h-[70vh] object-contain"
              />
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTakeDetailPage;