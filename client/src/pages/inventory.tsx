import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Upload, 
  PackageCheck, 
  AlertTriangle,
  ScanLine,
  Barcode 
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Store, 
  Shelf, 
  Product, 
  Inventory, 
  InsertInventory 
} from "@shared/schema";
import { CSVUpload } from "@/components/csv-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import BarcodeScanner from "@/components/barcode-scanner";
import BarcodeDisplay from "@/components/barcode-display";

type InventoryWithDetails = Inventory & { 
  product: Product;
  shelf: Shelf;
};

// Type for CSV upload inventory item
type InventoryCSVItem = {
  productSku: string;
  storeName: string;
  shelfName?: string;
  section?: string;
  quantity: number;
  notes?: string;
};

const InventoryPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryWithDetails | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addInventoryTab, setAddInventoryTab] = useState<string>("quick-add");
  const [csvData, setCsvData] = useState<InventoryCSVItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Quick add form state
  const [quickAddProduct, setQuickAddProduct] = useState<string>("");
  const [quickAddStore, setQuickAddStore] = useState<string>("");
  const [quickAddShelf, setQuickAddShelf] = useState<string>("");
  const [quickAddSection, setQuickAddSection] = useState<string>("");
  const [quickAddQuantity, setQuickAddQuantity] = useState<string>("1");
  const [quickAddNotes, setQuickAddNotes] = useState<string>("");

  // Fetch stores
  const { data: stores, isLoading: isLoadingStores } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  // Fetch products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch inventory for selected store
  const { 
    data: inventory, 
    isLoading: isLoadingInventory,
    error: inventoryError
  } = useQuery<InventoryWithDetails[]>({
    queryKey: ["/api/inventory", selectedStore],
    enabled: !!selectedStore,
  });

  // Mutation for uploading CSV inventory data
  const bulkUploadMutation = useMutation({
    mutationFn: async (data: InventoryCSVItem[]) => {
      const response = await apiRequest("POST", "/api/inventory/bulk-upload", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Inventory upload successful",
        description: data.message,
      });
      // Invalidate inventory queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsAddDialogOpen(false);
      setCsvData([]);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
      });
    }
  });

  // Mutation for quick adding inventory
  const quickAddMutation = useMutation({
    mutationFn: async (data: { 
      productId: number; 
      storeId: number;
      section?: string;
      shelfName?: string;
      quantity: number;
      notes?: string;
    }) => {
      const response = await apiRequest("POST", "/api/inventory/quick-add", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Inventory added",
        description: "Inventory item has been successfully added",
      });
      // Invalidate inventory queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      resetQuickAddForm();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to add inventory",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  });

  // Handle manage inventory click
  const handleManageInventory = (item: InventoryWithDetails) => {
    setSelectedItem(item);
    setIsManageDialogOpen(true);
  };

  // Filter inventory based on search query
  const filteredInventory = inventory?.filter(item => 
    item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.shelf.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Inventory status function
  // Reset quick add form
  const resetQuickAddForm = () => {
    setQuickAddProduct("");
    setQuickAddStore("");
    setQuickAddShelf("");
    setQuickAddSection("");
    setQuickAddQuantity("1");
    setQuickAddNotes("");
  };
  
  // Handle CSV data after parsing
  const handleCsvData = (data: InventoryCSVItem[]) => {
    setCsvData(data);
  };
  
  // Handle upload of CSV data
  const handleUploadCsv = () => {
    if (csvData.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to upload",
        description: "Please upload a CSV file first",
      });
      return;
    }
    
    bulkUploadMutation.mutate(csvData);
  };
  
  // Handle quick add form submission
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quickAddProduct || !quickAddStore) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: "Product and Store are required",
      });
      return;
    }
    
    const productId = parseInt(quickAddProduct);
    const storeId = parseInt(quickAddStore);
    const quantity = parseInt(quickAddQuantity) || 1;
    
    if (isNaN(productId) || isNaN(storeId) || isNaN(quantity)) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: "Please check your inputs",
      });
      return;
    }
    
    quickAddMutation.mutate({
      productId,
      storeId,
      shelfName: quickAddShelf || undefined,
      section: quickAddSection || undefined,
      quantity,
      notes: quickAddNotes || undefined,
    });
  };

  // Handle barcode scan
  const handleBarcodeScan = (barcode: string, result: any) => {
    // Handle the barcode scan
    setIsScannerOpen(false);
    
    // If the barcode is a product SKU, search for it
    const product = products?.find(p => p.sku === barcode);
    
    if (product) {
      setSearchQuery(barcode);
      toast({
        title: "Product found",
        description: `Found ${product.name} with SKU ${barcode}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Product not found",
        description: `No product found with barcode/SKU ${barcode}`,
      });
    }
  };

  // Handle barcode scan error
  const handleBarcodeScanError = (error: string) => {
    toast({
      variant: "destructive",
      title: "Scanner error",
      description: error,
    });
  };

  // Inventory status function
  const getStockStatus = (item: InventoryWithDetails) => {
    const percentage = (item.quantity / item.product.minStockLevel) * 100;
    
    if (percentage <= 50) {
      return { 
        label: "Critical", 
        color: "bg-destructive text-destructive-foreground",
        progressColor: "bg-destructive"
      };
    } else if (percentage <= 100) {
      return { 
        label: "Low", 
        color: "bg-warning text-warning-foreground",
        progressColor: "bg-warning"
      };
    } else {
      return { 
        label: "Good", 
        color: "bg-success text-success-foreground",
        progressColor: "bg-success"
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <Button onClick={() => setIsAddDialogOpen(true)} disabled={!isAdmin}>
          <Plus className="h-4 w-4 mr-2" /> Add Inventory
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product name, SKU, or location..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute right-2 top-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsScannerOpen(true)}
                    title="Scan barcode"
                  >
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Store" />
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
                        {store.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!selectedStore ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 p-4 bg-muted rounded-full">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Select a store to view inventory</h3>
              <p className="text-muted-foreground mt-1">
                Choose a store from the dropdown to see inventory items
              </p>
            </div>
          ) : isLoadingInventory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : inventoryError ? (
            <div className="py-8 text-center text-destructive">
              Error loading inventory data. Please try again.
            </div>
          ) : filteredInventory?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 p-4 bg-muted rounded-full">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No inventory items found</h3>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory?.map((item) => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product.name}</TableCell>
                        <TableCell>{item.product.sku}</TableCell>
                        <TableCell>
                          {item.shelf.section} - {item.shelf.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col w-32">
                            <div className="flex justify-between mb-1 text-xs">
                              <span>{item.quantity} units</span>
                              <span>{item.product.minStockLevel} min</span>
                            </div>
                            <Progress 
                              value={(item.quantity / item.product.minStockLevel) * 100} 
                              max={200}
                              className={`h-2 ${stockStatus.progressColor}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={stockStatus.color}>
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            onClick={() => handleManageInventory(item)}
                          >
                            Manage
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

      {/* Manage Inventory Dialog */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Inventory</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{selectedItem.product.name}</h3>
                <p className="text-sm text-muted-foreground">SKU: {selectedItem.product.sku}</p>
                <p className="text-sm text-muted-foreground">
                  Location: {selectedItem.shelf.section} - {selectedItem.shelf.name}
                </p>
                <div className="mt-3">
                  <BarcodeDisplay 
                    value={selectedItem.product.sku} 
                    format="CODE128"
                    text={selectedItem.product.name}
                    displayValue={true}
                    height={70}
                  />
                </div>
              </div>
              
              <div className="border rounded-md p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Current Stock:</span>
                  <span className="text-sm">{selectedItem.quantity} units</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Minimum Level:</span>
                  <span className="text-sm">{selectedItem.product.minStockLevel} units</span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Stock Status</span>
                  </div>
                  <Progress 
                    value={(selectedItem.quantity / selectedItem.product.minStockLevel) * 100} 
                    max={200}
                    className={`h-2 ${getStockStatus(selectedItem).progressColor}`}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Adjust Inventory</h4>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    - Remove Stock
                  </Button>
                  <Button className="flex-1">
                    + Add Stock
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Inventory Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Inventory</DialogTitle>
            <DialogDescription>
              Add inventory items individually or upload in bulk using CSV.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={addInventoryTab} onValueChange={setAddInventoryTab} className="mt-4">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="quick-add">
                <PackageCheck className="mr-2 h-4 w-4" /> Quick Add
              </TabsTrigger>
              <TabsTrigger value="csv-upload">
                <Upload className="mr-2 h-4 w-4" /> CSV Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quick-add">
              <form onSubmit={handleQuickAddSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="product">Product</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select 
                            value={quickAddProduct} 
                            onValueChange={setQuickAddProduct}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Product" />
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
                                    {product.name} ({product.sku})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          onClick={() => setIsScannerOpen(true)}
                          title="Scan product barcode"
                        >
                          <ScanLine className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="store">Store</Label>
                      <Select 
                        value={quickAddStore} 
                        onValueChange={setQuickAddStore}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Store" />
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
                                {store.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="section">Section</Label>
                      <Input
                        id="section"
                        placeholder="e.g. Aisle 5, Dairy, etc."
                        value={quickAddSection}
                        onChange={(e) => setQuickAddSection(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="shelf">Shelf Name</Label>
                      <Input
                        id="shelf"
                        placeholder="e.g. Top Shelf, Display Case"
                        value={quickAddShelf}
                        onChange={(e) => setQuickAddShelf(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="Enter quantity"
                      min={1}
                      value={quickAddQuantity}
                      onChange={(e) => setQuickAddQuantity(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Any additional notes"
                      value={quickAddNotes}
                      onChange={(e) => setQuickAddNotes(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={quickAddMutation.isPending || !quickAddProduct || !quickAddStore}
                  >
                    {quickAddMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Inventory
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="csv-upload">
              <div className="space-y-4">
                <CSVUpload
                  onDataParsed={handleCsvData}
                  headerMapping={{
                    "product_sku": "productSku",
                    "store_name": "storeName",
                    "shelf_name": "shelfName",
                    "section": "section",
                    "quantity": "quantity",
                    "notes": "notes"
                  }}
                  isUploading={bulkUploadMutation.isPending}
                  templateHeaders={[
                    "product_sku", 
                    "store_name", 
                    "shelf_name", 
                    "section", 
                    "quantity", 
                    "notes"
                  ]}
                  templateFilename="inventory_template.csv"
                  instructions="Upload a CSV file with product SKUs, store names, and quantities to add inventory in bulk. 
                    Required columns: product_sku, store_name, quantity. Optional: shelf_name, section, notes."
                />

                {csvData.length > 0 && (
                  <div className="border rounded-lg p-4 my-4">
                    <h3 className="text-md font-medium mb-2">CSV Data Preview</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {csvData.length} records ready to be imported
                    </p>
                    
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead>Shelf</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead>Quantity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvData.slice(0, 5).map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.productSku}</TableCell>
                              <TableCell>{item.storeName}</TableCell>
                              <TableCell>{item.shelfName || "-"}</TableCell>
                              <TableCell>{item.section || "-"}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {csvData.length > 5 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        And {csvData.length - 5} more items...
                      </p>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <div className="flex justify-end gap-2 w-full">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleUploadCsv} 
                      disabled={bulkUploadMutation.isPending || csvData.length === 0}
                    >
                      {bulkUploadMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Data
                        </>
                      )}
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      {/* Barcode Scanner Dialog */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
            <DialogDescription>
              Scan a product barcode to search or add inventory
            </DialogDescription>
          </DialogHeader>
          <BarcodeScanner 
            onScanSuccess={handleBarcodeScan} 
            onScanError={handleBarcodeScanError}
            onClose={() => setIsScannerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
