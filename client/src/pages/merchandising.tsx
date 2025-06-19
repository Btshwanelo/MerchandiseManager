import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Plus,
  Upload,
  Store,
  Camera,
  Save,
  File,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Product, Store as StoreType } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { validateFileUpload } from "@/lib/file-utils";

const MerchandisingPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [fileUploads, setFileUploads] = useState<File[]>([]);
  const [imagePreviewDialogOpen, setImagePreviewDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [promotionItems, setPromotionItems] = useState<
    Array<{ productId: number; price: number }>
  >([]);

  // Fetch stores
  const { data: stores, isLoading: isLoadingStores } = useQuery<StoreType[]>({
    queryKey: ["/api/stores"],
  });

  // Fetch products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Add item to merchandising promotion
  const handleAddItem = () => {
    if (!selectedProduct || selectedProduct === "") {
      toast({
        title: "Select a product",
        description: "Please select a product from the dropdown menu.",
        variant: "destructive",
      });
      return;
    }

    if (!price || isNaN(parseFloat(price))) {
      toast({
        title: "Enter a valid price",
        description: "Please enter a valid price for the product.",
        variant: "destructive",
      });
      return;
    }

    const productId = parseInt(selectedProduct);
    const priceInCents = Math.round(parseFloat(price) * 100);

    // Check if product already exists in the list
    const existingItemIndex = promotionItems.findIndex(
      (item) => item.productId === productId
    );

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...promotionItems];
      updatedItems[existingItemIndex].price = priceInCents;
      setPromotionItems(updatedItems);
    } else {
      // Add new item
      setPromotionItems([
        ...promotionItems,
        { productId, price: priceInCents },
      ]);
    }

    // Reset selection
    setSelectedProduct("");
    setPrice("");
  };

  // Remove item from promotion
  const handleRemoveItem = (index: number) => {
    const updatedItems = promotionItems.filter((_, i) => i !== index);
    setPromotionItems(updatedItems);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      // Validate file size (4MB limit)
      const validFiles: File[] = [];
      for (const file of newFiles) {
        const validation = validateFileUpload(file);
        if (!validation.valid) {
          toast({
            title: "File too large",
            description: `${file.name}: ${validation.error}`,
            variant: "destructive",
          });
        } else {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        setFileUploads([...fileUploads, ...validFiles]);
      }
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

  // Create merchandising promotion mutation
  const createPromotionMutation = useMutation({
    mutationFn: async (promotionData) => {
      const res = await apiRequest(
        "POST",
        "/api/merchandising-promotions",
        promotionData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/merchandising-promotions"],
      });
      toast({
        title: "Promotion submitted",
        description:
          "The merchandising promotion has been successfully submitted.",
      });
      // Reset form
      setSelectedStore("");
      setPromotionItems([]);
      setFileUploads([]);
    },
    onError: (error) => {
      toast({
        title: "Failed to submit promotion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit promotion
  const handleSubmit = async () => {
    if (!selectedStore) {
      toast({
        title: "Store required",
        description: "Please select a store for this promotion.",
        variant: "destructive",
      });
      return;
    }

    if (promotionItems.length === 0) {
      toast({
        title: "No items added",
        description: "Please add at least one product to the promotion.",
        variant: "destructive",
      });
      return;
    }

    if (fileUploads.length === 0) {
      toast({
        title: "No images added",
        description: "Please add at least one image of the promotion.",
        variant: "destructive",
      });
      return;
    }

    // Submit promotion
    const promotionData = {
      storeId: parseInt(selectedStore),
      items: promotionItems,
      pictures: fileUploads.map((file) => file.name),
    };

    createPromotionMutation.mutate(promotionData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Merchandising & Promotions</h1>
        <Button
          onClick={handleSubmit}
          disabled={createPromotionMutation.isPending}
        >
          {createPromotionMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Submit Promotion
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Promotion Products & Pricing</CardTitle>
              <div className="space-x-2">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md flex items-center text-sm">
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Promotion Photos
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
              {/* Add Product & Price Section */}
              <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Product</label>
                  <Select
                    value={selectedProduct}
                    onValueChange={setSelectedProduct}
                  >
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
                          <SelectItem
                            key={product.id}
                            value={product.id.toString()}
                          >
                            {product.name} - {product.sku}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-32 space-y-2">
                  <label className="text-sm font-medium">Price (R)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 h-4 w-4 text-muted-foreground">
                      R
                    </span>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button onClick={handleAddItem} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </div>

              {/* Uploaded Files */}
              {fileUploads.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Uploaded Promotion Photos
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {fileUploads.map((file, index) => (
                      <div key={index} className="relative group">
                        <div
                          className="h-32 border rounded-md flex items-center justify-center bg-muted/20 cursor-pointer overflow-hidden"
                          onClick={() => handlePreviewImage(file)}
                        >
                          {file.type.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-sm p-2">
                              <File className="h-8 w-8 text-muted-foreground mb-1" />
                              <span className="text-xs truncate w-full text-center">
                                {file.name}
                              </span>
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
                </div>
              )}

              {/* Product List */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Promotion Products</h3>
                {promotionItems.length === 0 ? (
                  <div className="border rounded-md p-6 text-center text-muted-foreground">
                    No products added yet. Select a product and price to add it
                    to the promotion.
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Regular Price</TableHead>
                          <TableHead>Promotion Price</TableHead>
                          <TableHead className="w-10">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {promotionItems.map((item, index) => {
                          const product = products?.find(
                            (p) => p.id === item.productId
                          );
                          if (!product) return null;

                          // Calculate discount percentage
                          const regularPrice = product.price;
                          const promotionPrice = item.price;
                          const discountPercent = Math.round(
                            (1 - promotionPrice / regularPrice) * 100
                          );

                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {product.name}
                              </TableCell>
                              <TableCell>{product.sku}</TableCell>
                              <TableCell>{product.category}</TableCell>
                              <TableCell>
                                {formatCurrency(product.price)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-primary">
                                    {formatCurrency(promotionPrice)}
                                  </span>
                                  {discountPercent > 0 && (
                                    <span className="text-xs text-success">
                                      {discountPercent}% off
                                    </span>
                                  )}
                                </div>
                              </TableCell>
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
              <CardTitle>Promotion Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Total Products</span>
                  <span className="text-xl font-bold">
                    {promotionItems.length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Store</span>
                  <span className="text-md font-medium">
                    {selectedStore
                      ? stores?.find((s) => s.id.toString() === selectedStore)
                          ?.name
                      : "Not selected"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Photos</span>
                  <span className="text-md font-medium">
                    {fileUploads.length} uploaded
                  </span>
                </div>
              </div>

              <div className="bg-muted/20 p-4 rounded-md">
                <h4 className="font-medium mb-2">Average Discount</h4>
                {promotionItems.length > 0 ? (
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-success mr-2">
                      {calculateAverageDiscount()}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      off regular prices
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Add products to see average discount
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog
        open={imagePreviewDialogOpen}
        onOpenChange={setImagePreviewDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
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

  // Helper function to calculate average discount
  function calculateAverageDiscount() {
    if (promotionItems.length === 0 || !products) return 0;

    let totalDiscountPercent = 0;

    promotionItems.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        const regularPrice = product.price;
        const promotionPrice = item.price;
        const discountPercent = Math.round(
          (1 - promotionPrice / regularPrice) * 100
        );
        totalDiscountPercent += discountPercent;
      }
    });

    return Math.round(totalDiscountPercent / promotionItems.length);
  }
};

export default MerchandisingPage;
