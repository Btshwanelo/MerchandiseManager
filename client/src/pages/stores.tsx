import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
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
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Loader2, Plus, Search, MapPin, Store as StoreIcon, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UserRole, Store, insertStoreSchema } from "@shared/schema";

const StoresPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFormOpen, setStoreFormOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [shelvesDlgOpen, setShelvesDlgOpen] = useState(false);
  const [currentStoreId, setCurrentStoreId] = useState<number | null>(null);

  // Check if user can manage stores
  const canManageStores = user?.role === UserRole.ADMIN;

  // Form setup
  const form = useForm<z.infer<typeof insertStoreSchema>>({
    resolver: zodResolver(insertStoreSchema),
    defaultValues: {
      name: "",
      location: "",
      managerId: undefined,
    },
  });

  // Get stores
  const { data: stores, isLoading, error } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  // Get users for manager selection
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    enabled: canManageStores,
  });

  // Get shelves for a store
  const { data: shelves, isLoading: isLoadingShelves } = useQuery({
    queryKey: ["/api/stores", currentStoreId, "shelves"],
    enabled: !!currentStoreId,
  });

  // Create store mutation
  const createStoreMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertStoreSchema>) => {
      const res = await apiRequest("POST", "/api/stores", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setStoreFormOpen(false);
      form.reset();
      toast({
        title: "Store created",
        description: "The store has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create store",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update store mutation
  const updateStoreMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertStoreSchema> & { id: number }) => {
      const { id, ...data } = values;
      const res = await apiRequest("PUT", `/api/stores/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setStoreFormOpen(false);
      form.reset();
      setSelectedStore(null);
      toast({
        title: "Store updated",
        description: "The store has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update store",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof insertStoreSchema>) => {
    if (selectedStore) {
      updateStoreMutation.mutate({ ...values, id: selectedStore.id });
    } else {
      createStoreMutation.mutate(values);
    }
  };

  const handleEditStore = (store: Store) => {
    setSelectedStore(store);
    form.reset({
      name: store.name,
      location: store.location,
      managerId: store.managerId,
    });
    setStoreFormOpen(true);
  };

  const handleAddNewStore = () => {
    setSelectedStore(null);
    form.reset({
      name: "",
      location: "",
      managerId: undefined,
    });
    setStoreFormOpen(true);
  };

  const handleViewShelves = (storeId: number) => {
    setCurrentStoreId(storeId);
    setShelvesDlgOpen(true);
  };

  // Filter stores based on search query
  const filteredStores = stores?.filter((store) => {
    return store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.location.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Store Management</h1>
        {canManageStores && (
          <Button onClick={handleAddNewStore}>
            <Plus className="h-4 w-4 mr-2" /> Add Store
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Stores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or location..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">
              Error loading stores. Please try again.
            </div>
          ) : filteredStores?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 p-4 bg-muted rounded-full">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No stores found</h3>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search or add a new store
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Shelves</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores?.map((store) => {
                    const manager = users?.find(u => u.id === store.managerId);
                    return (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <StoreIcon className="h-4 w-4 mr-2 text-primary" />
                            {store.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            {store.location}
                          </div>
                        </TableCell>
                        <TableCell>
                          {manager ? (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-muted-foreground" />
                              {manager.name}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              No Manager
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewShelves(store.id)}
                          >
                            View Shelves
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          {canManageStores && (
                            <Button
                              variant="ghost"
                              onClick={() => handleEditStore(store)}
                            >
                              Edit
                            </Button>
                          )}
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

      {/* Store Form Dialog */}
      <Dialog open={storeFormOpen} onOpenChange={setStoreFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedStore ? "Edit Store" : "Add New Store"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter store name" {...field} />
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
                    <FormControl>
                      <Input placeholder="Enter store location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="managerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value?.toString() || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseInt(value) : undefined);
                        }}
                      >
                        <option value="">Select a manager</option>
                        {users?.filter(u => u.role === UserRole.MANAGER).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={createStoreMutation.isPending || updateStoreMutation.isPending}>
                  {(createStoreMutation.isPending || updateStoreMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedStore ? "Update Store" : "Create Store"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Shelves Dialog */}
      <Dialog open={shelvesDlgOpen} onOpenChange={setShelvesDlgOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Store Shelves
            </DialogTitle>
          </DialogHeader>

          {isLoadingShelves ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : shelves?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <h3 className="text-lg font-medium">No shelves found</h3>
              <p className="text-muted-foreground mt-1">
                This store has no shelves configured
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shelf Name</TableHead>
                    <TableHead>Section</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shelves?.map((shelf) => (
                    <TableRow key={shelf.id}>
                      <TableCell className="font-medium">{shelf.name}</TableCell>
                      <TableCell>{shelf.section}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            {canManageStores && (
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Shelf
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoresPage;
