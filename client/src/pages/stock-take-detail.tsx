import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ArrowLeft,
  Save,
  Edit,
  AlertTriangle,
  User,
  Calendar,
  Store,
  ShoppingBag,
  CheckCircle,
  Upload,
  Eye,
  X,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { formatDistanceToNow, format } from "date-fns";
import {
  Product,
  Store as StoreType,
  StockLocation,
  StockTake as DbStockTake,
  StockTakeItem as DbStockTakeItem,
  User as UserType,
  UserRole,
} from "@shared/schema";
import * as z from "zod";
import { getFileUrl, processImagePaths } from "@/lib/file-utils";

// Define types that extend the database models
type StockTake = DbStockTake & {
  pictures: string[];
  user?: UserType;
  store?: StoreType;
  lastEditedBy?: UserType;
  items?: StockTakeItemWithDetails[];
};

type StockTakeItemWithDetails = DbStockTakeItem & {
  product?: Product;
};

// Form schema for editing stock take items
const editStockTakeItemSchema = z.object({
  quantity: z.coerce.number().min(0, "Quantity must be a positive number"),
  location: z.enum([StockLocation.SHELF, StockLocation.BACK_STORE]),
  auditComment: z
    .string()
    .min(5, "Audit comment must be at least 5 characters"),
});

type EditStockTakeItemFormValues = z.infer<typeof editStockTakeItemSchema>;

const StockTakeDetailPage = () => {
  console.log("Tshwanelo V1");
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentItemBeingEdited, setCurrentItemBeingEdited] =
    useState<StockTakeItemWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  // Get stock take from window history state if available
  const passedStockTake = window.history.state?.stockTake;

  console.log("Tshwanelo V1");

  // Log for debugging
  console.log("History state:", window.history.state);
  console.log("Passed stock take data:", passedStockTake);

  console.log("Tshwanelo V2 - About to create useQuery with ID:", id);

  // Fetch the stock take with its items if not passed through state
  const { data: fetchedStockTake, isLoading: isLoadingStockTake } =
    useQuery<StockTake>({
      queryKey: ["stock-take-detail", id, "fresh"],
      queryFn: async () => {
        console.log("Stock take detail page - API call being made for ID:", id);
        const response = await apiRequest("GET", `/api/stock-takes/${id}`);
        const data = await response.json();
        console.log("Stock take detail page - API response:", data);
        return data;
      },
      enabled: !!id, // Always fetch, even if we have passed data
      staleTime: 0, // Always consider data stale
      gcTime: 0, // Don't cache
      refetchOnMount: true, // Always refetch on mount
    });

  console.log("Tshwanelo V3 - useQuery created, state:", {
    id,
    enabled: !!id,
    isLoadingStockTake,
    fetchedStockTake,
  });

  // Force refetch on mount
  useEffect(() => {
    console.log("Tshwanelo V4 - useEffect called with ID:", id);
    console.log("Stock take detail page - Component mounted, ID:", id);
    if (id) {
      console.log(
        "Stock take detail page - Triggering manual refetch for ID:",
        id
      );
      queryClient.invalidateQueries({ queryKey: ["stock-take-detail", id] });
    }
  }, [id, queryClient]);

  // Use fetched data if available, otherwise fall back to passed data
  const stockTake = fetchedStockTake || passedStockTake;
  const isLoading = isLoadingStockTake;

  // Debug logging for stock take data
  console.log("Stock take detail page - stock take data:", {
    stockTake,
    pictures: stockTake?.pictures,
    picturesType: typeof stockTake?.pictures,
    isArray: Array.isArray(stockTake?.pictures),
  });

  // Form setup
  const form = useForm<EditStockTakeItemFormValues>({
    resolver: zodResolver(editStockTakeItemSchema),
    defaultValues: {
      quantity: 0,
      location: StockLocation.SHELF,
      auditComment: "",
    },
  });

  // Helper function to safely format dates
  const formatDate = (date: Date | string | null) => {
    if (!date) return "Unknown date";
    return format(new Date(date), "PPP p");
  };

  // Handle opening the edit dialog for an item
  const handleEditItem = (item: StockTakeItemWithDetails) => {
    setCurrentItemBeingEdited(item);
    form.reset({
      quantity: item.quantity,
      location: item.location as StockLocation, // Ensure we cast to enum type
      auditComment: "",
    });
    setIsEditDialogOpen(true);
  };

  // Handle the submission of edits
  const editStockTakeItemMutation = useMutation({
    mutationFn: async (
      data: EditStockTakeItemFormValues & { itemId: number }
    ) => {
      const { itemId, ...updateData } = data;
      const response = await apiRequest(
        "PUT",
        `/api/stock-take-items/${itemId}`,
        updateData
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item updated",
        description: "The stock take item has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["stock-take-detail", id] });
      setIsEditDialogOpen(false);
      setCurrentItemBeingEdited(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle the form submission
  const onSubmit = (values: EditStockTakeItemFormValues) => {
    if (!currentItemBeingEdited) {
      toast({
        title: "Error",
        description: "No item selected for editing",
        variant: "destructive",
      });
      return;
    }

    editStockTakeItemMutation.mutate({
      ...values,
      itemId: currentItemBeingEdited.id,
    });
  };

  // View image in a dialog
  const handleViewImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageDialogOpen(true);
  };

  // Check if the user is allowed to edit
  const canEdit = user?.role === UserRole.ADMIN;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stockTake) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/stock-take")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stock Takes
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-10">
              <AlertTriangle className="h-10 w-10 text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Stock Take Not Found
              </h3>
              <p className="text-muted-foreground text-center">
                The requested stock take could not be found or you don't have
                permission to view it.
              </p>
              <Button
                className="mt-6"
                onClick={() => setLocation("/stock-take")}
              >
                Return to Stock Takes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/stock-take")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Stock Take Details</h1>
          </div>
          {stockTake.store && (
            <p className="text-muted-foreground">
              {stockTake.store.name} - {formatDate(stockTake.date)}
            </p>
          )}
        </div>
      </div>

      <Tabs
        defaultValue="details"
        className="space-y-6"
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          {stockTake.pictures && stockTake.pictures.length > 0 && (
            <TabsTrigger value="photos">
              Photos ({stockTake.pictures.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Take Information</CardTitle>
              <CardDescription>
                Basic information about this stock take
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Date Submitted
                    </h3>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{formatDate(stockTake.date)}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Store
                    </h3>
                    <div className="flex items-center">
                      <Store className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{stockTake.store?.name || "Unknown"}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Submitted By
                    </h3>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{stockTake.user?.name || "Unknown"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Status
                    </h3>
                    <Badge className="capitalize">
                      {stockTake.status
                        ? stockTake.status.toLowerCase()
                        : "unknown"}
                    </Badge>
                  </div>

                  {stockTake.items && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Items
                      </h3>
                      <div className="flex items-center">
                        <ShoppingBag className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{stockTake.items.length} products</span>
                      </div>
                    </div>
                  )}

                  {stockTake.lastEditedAt && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Last Edited
                      </h3>
                      <div className="flex items-start">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground mt-1" />
                        <div className="flex flex-col">
                          <span>{formatDate(stockTake.lastEditedAt)}</span>
                          {stockTake.lastEditedBy && (
                            <span className="text-sm text-muted-foreground">
                              by {stockTake.lastEditedBy.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {stockTake.comment && (
                <div className="pt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Comments
                  </h3>
                  <div className="bg-muted p-4 rounded-md">
                    {stockTake.comment}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                <div>
                  <CardTitle>Stock Take Items</CardTitle>
                  <CardDescription>
                    Individual items recorded in this stock take
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:items-end">
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Store:</span>
                    <span className="font-medium text-right">
                      {stockTake.store?.name || "Unknown"}
                    </span>

                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium text-right">
                      {formatDate(stockTake.date).split("at")[0]}
                    </span>

                    <span className="text-muted-foreground">Merchandiser:</span>
                    <span className="font-medium text-right">
                      {stockTake.user?.name || "Unknown"}
                    </span>

                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-right">
                      <Badge
                        variant={
                          stockTake.status === "completed"
                            ? "default"
                            : "outline"
                        }
                        className="capitalize"
                      >
                        {stockTake.status || "unknown"}
                      </Badge>
                    </span>
                  </div>
                </div>
              </div>
              {canEdit && (
                <div className="flex justify-end mt-2">
                  <Button variant="outline" size="sm" className="ml-auto">
                    <Upload className="h-4 w-4 mr-2" />
                    Export Items
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {stockTake.items && stockTake.items.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockTake.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.product?.name || "Unknown Product"}
                          </TableCell>
                          <TableCell>{item.product?.sku || "-"}</TableCell>
                          <TableCell>{item.product?.category || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                item.quantity === 0
                                  ? "destructive"
                                  : item.quantity <
                                    (item.product?.minStockLevel || 5)
                                  ? "warning"
                                  : "default"
                              }
                            >
                              {item.quantity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {item.location.toLowerCase().replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditItem(item)}
                                disabled={editStockTakeItemMutation.isPending}
                              >
                                {editStockTakeItemMutation.isPending &&
                                editingItemId === item.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Edit className="h-4 w-4 mr-2" />
                                )}
                                Edit
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Items Found</h3>
                  <p className="text-muted-foreground text-center">
                    There are no items recorded in this stock take.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {stockTake.pictures && stockTake.pictures.length > 0 && (
          <TabsContent value="photos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Take Photos</CardTitle>
                <CardDescription>
                  Photos submitted with this stock take
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stockTake.pictures.map((picture, index) => {
                    // Convert file ID to URL
                    const imageUrl = getFileUrl(picture);

                    // Debug logging
                    console.log(`Stock take image ${index + 1}:`, {
                      originalPicture: picture,
                      type: typeof picture,
                      generatedUrl: imageUrl,
                      isNumeric: !isNaN(parseInt(picture)),
                    });

                    return (
                      <div
                        key={index}
                        className="border rounded-md overflow-hidden cursor-pointer transition-transform hover:scale-105"
                        onClick={() => handleViewImage(imageUrl)}
                      >
                        <img
                          src={imageUrl}
                          alt={`Stock take photo ${index + 1}`}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            console.error(`Image failed to load:`, {
                              src: imageUrl,
                              originalPicture: picture,
                              error: e,
                            });
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-48 bg-muted/50 flex items-center justify-center">
                                  <div class="text-center text-muted-foreground">
                                    <Eye class="h-8 w-8 mx-auto mb-2" />
                                    <p class="text-sm">Image not available</p>
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                        <div className="p-2 bg-muted text-center">
                          <span className="text-sm">Photo {index + 1}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                <div>
                  <CardTitle>Audit History</CardTitle>
                  <CardDescription>
                    Record of changes made to this stock take
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:items-end">
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Store:</span>
                    <span className="font-medium text-right">
                      {stockTake.store?.name || "Unknown"}
                    </span>

                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium text-right">
                      {formatDate(stockTake.date).split("at")[0]}
                    </span>

                    <span className="text-muted-foreground">Merchandiser:</span>
                    <span className="font-medium text-right">
                      {stockTake.user?.name || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>
              {canEdit && (
                <div className="flex justify-end mt-2">
                  <Button variant="outline" size="sm" className="ml-auto">
                    <Upload className="h-4 w-4 mr-2" />
                    Export Audit Log
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {stockTake.lastEditedAt ? (
                <div className="space-y-4">
                  {/* Simulated audit log entries for demonstration */}
                  <div className="flex items-start space-x-4 border-l-2 border-primary pl-4 pb-6">
                    <div className="rounded-full bg-primary h-8 w-8 flex items-center justify-center">
                      <Edit className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          Stock Take Item Edited
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(stockTake.lastEditedAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        <span className="font-medium">
                          {stockTake.lastEditedBy?.name || "Admin"}
                        </span>{" "}
                        updated the quantity of product
                        <span className="font-medium">
                          {" "}
                          {stockTake.items && stockTake.items[0]?.product?.name}
                        </span>
                        .
                      </p>
                      {stockTake.auditComment && (
                        <div className="mt-2 bg-muted p-3 rounded-md">
                          <p className="text-sm">
                            <span className="font-medium">Comment:</span>{" "}
                            {stockTake.auditComment}
                          </p>
                        </div>
                      )}
                      <div className="mt-3 border-t pt-3 text-sm">
                        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                          <span className="text-muted-foreground">Field</span>
                          <span className="text-muted-foreground">
                            Old Value
                          </span>
                          <span className="text-muted-foreground">
                            New Value
                          </span>

                          <span>Quantity</span>
                          <span className="text-red-500 line-through">3</span>
                          <span className="text-green-600">
                            {stockTake.items && stockTake.items[0]?.quantity}
                          </span>

                          <span>Location</span>
                          <span className="text-muted-foreground">shelf</span>
                          <span className="text-muted-foreground">
                            {stockTake.items &&
                              stockTake.items[0]?.location
                                .toLowerCase()
                                .replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 border-l-2 border-blue-500 pl-4 pb-6">
                    <div className="rounded-full bg-blue-500 h-8 w-8 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          Stock Take Submitted
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(stockTake.date || "").toLocaleDateString()}{" "}
                          at{" "}
                          {new Date(stockTake.date || "").toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        <span className="font-medium">
                          {stockTake.user?.name || "Unknown User"}
                        </span>{" "}
                        submitted this stock take with{" "}
                        {stockTake.items?.length || 0} items.
                      </p>
                      {stockTake.comment && (
                        <div className="mt-2 bg-muted p-3 rounded-md">
                          <p className="text-sm">
                            <span className="font-medium">
                              Merchandiser Comment:
                            </span>{" "}
                            {stockTake.comment}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 border-l-2 border-gray-300 pl-4">
                    <div className="rounded-full bg-gray-200 h-8 w-8 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Stock Take Assigned</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(
                            new Date(stockTake.date || "").getTime() - 86400000
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        This stock take was assigned to{" "}
                        <span className="font-medium">
                          {stockTake.user?.name || "Unknown User"}
                        </span>{" "}
                        for store{" "}
                        <span className="font-medium">
                          {stockTake.store?.name || "Unknown Store"}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    No Audit History
                  </h3>
                  <p className="text-muted-foreground text-center">
                    This stock take has not been edited since creation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Stock Take Item</DialogTitle>
            <DialogDescription>
              Update the quantity and location of this stock take item. As an
              admin, you must provide a reason for this edit.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {currentItemBeingEdited?.product && (
                <div className="rounded-md bg-muted p-4 mb-4">
                  <h4 className="font-medium">
                    {currentItemBeingEdited.product.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    SKU: {currentItemBeingEdited.product.sku}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={
                            field.value === StockLocation.SHELF
                              ? "default"
                              : "outline"
                          }
                          className="flex-1"
                          onClick={() =>
                            form.setValue("location", StockLocation.SHELF)
                          }
                        >
                          Shelf
                        </Button>
                        <Button
                          type="button"
                          variant={
                            field.value === StockLocation.BACK_STORE
                              ? "default"
                              : "outline"
                          }
                          className="flex-1"
                          onClick={() =>
                            form.setValue("location", StockLocation.BACK_STORE)
                          }
                        >
                          Back Store
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="auditComment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <span className="flex items-center">
                        Audit Comment
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="ml-1">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Required: Explain why you're editing this stock
                                take item
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Correcting counting error based on physical verification"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Please provide a detailed reason for this edit for audit
                      purposes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={editStockTakeItemMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editStockTakeItemMutation.isPending}
                >
                  {editStockTakeItemMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-[800px] p-1">
          <img
            src={selectedImage}
            alt="Stock take photo"
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTakeDetailPage;
