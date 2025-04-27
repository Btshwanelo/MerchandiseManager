import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Filter, ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Store, Shelf, Product, Inventory } from "@shared/schema";

type InventoryWithDetails = Inventory & { 
  product: Product;
  shelf: Shelf;
};

const InventoryPage = () => {
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryWithDetails | null>(null);

  // Fetch stores
  const { data: stores, isLoading: isLoadingStores } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
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
        <Button>
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
                              className="h-2"
                              indicatorClassName={stockStatus.progressColor}
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
                    className="h-2"
                    indicatorClassName={getStockStatus(selectedItem).progressColor}
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
    </div>
  );
};

export default InventoryPage;
