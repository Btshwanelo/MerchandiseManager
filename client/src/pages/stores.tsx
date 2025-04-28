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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { DataLoadError } from "@/components/ui/error-state";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Loader2, 
  Plus, 
  Search, 
  Store as StoreIcon, 
  Upload,
  MapPin,
  User
} from "lucide-react";
import { Store, User as UserType, UserRole, insertStoreSchema } from "@shared/schema";
import { CSVUpload } from "@/components/csv-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Type for CSV upload store item
type StoreCSVItem = {
  name: string;
  location: string;
  managerUsername?: string;
};

const StoresPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addStoreTab, setAddStoreTab] = useState<string>("quick-add");
  const [csvData, setCsvData] = useState<StoreCSVItem[]>([]);

  // Define form schema for store creation
  const formSchema = insertStoreSchema.extend({
    managerUsername: z.string().optional()
  });

  type FormValues = z.infer<typeof formSchema>;

  // Form for quick add
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: "",
      managerUsername: ""
    }
  });

  // Fetch stores
  const { data: stores, isLoading: isLoadingStores, error: storesError, refetch: refetchStores } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  // Fetch managers (users with manager role)
  const { data: managers, isLoading: isLoadingManagers, error: managersError, refetch: refetchManagers } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    select: (users) => users?.filter(user => user.role === UserRole.MANAGER) || []
  });

  // Mutation for creating a store
  const createStoreMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // If managerUsername is provided, find the manager and use their ID
      let managerId = null;
      
      if (data.managerUsername) {
        const manager = managers?.find(m => m.username === data.managerUsername);
        if (manager) {
          managerId = manager.id;
        }
      }
      
      const storeData = {
        name: data.name,
        location: data.location,
        managerId
      };
      
      const response = await apiRequest("POST", "/api/stores", storeData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Store created",
        description: "Store has been successfully added",
      });
      // Invalidate stores query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      form.reset();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to create store",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  });

  // Mutation for uploading CSV store data
  const bulkUploadMutation = useMutation({
    mutationFn: async (data: StoreCSVItem[]) => {
      const response = await apiRequest("POST", "/api/stores/bulk-upload", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Stores upload successful",
        description: data.message,
      });
      // Invalidate stores query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
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

  // Handle CSV data after parsing
  const handleCsvData = (data: StoreCSVItem[]) => {
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
  
  // Handle form submission
  const onSubmit = (values: FormValues) => {
    createStoreMutation.mutate(values);
  };

  // Filter stores based on search query
  const filteredStores = stores?.filter(store => 
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Store Management</h1>
        <Button onClick={() => setIsAddDialogOpen(true)} disabled={!isAdmin}>
          <Plus className="h-4 w-4 mr-2" /> Add Store
        </Button>
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
                  placeholder="Search by store name or location..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {isLoadingStores ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredStores?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 p-4 bg-muted rounded-full">
                <StoreIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No stores found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? "Try adjusting your search" : "Add your first store to get started"}
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores?.map((store) => {
                    const manager = managers?.find(m => m.id === store.managerId);
                    
                    return (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>{store.location}</TableCell>
                        <TableCell>
                          {manager ? (
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{manager.name}</Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No manager assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost">
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

      {/* Add Store Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Store</DialogTitle>
            <DialogDescription>
              Add stores individually or upload in bulk using CSV.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={addStoreTab} onValueChange={setAddStoreTab} className="mt-4">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="quick-add">
                <StoreIcon className="mr-2 h-4 w-4" /> Quick Add
              </TabsTrigger>
              <TabsTrigger value="csv-upload">
                <Upload className="mr-2 h-4 w-4" /> CSV Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quick-add">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4">
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
                      name="managerUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manager (Optional)</FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a manager" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No manager</SelectItem>
                              {isLoadingManagers ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Loading managers...
                                </div>
                              ) : (
                                managers && managers.length > 0 ? 
                                managers.map((manager) => (
                                  <SelectItem key={manager.id} value={manager.username || ""}>
                                    {manager.name} ({manager.username})
                                  </SelectItem>
                                )) : 
                                <SelectItem value="no-managers">No managers available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                      disabled={createStoreMutation.isPending}
                    >
                      {createStoreMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Store
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="csv-upload">
              <div className="space-y-4">
                <CSVUpload
                  onDataParsed={handleCsvData}
                  headerMapping={{
                    "name": "name",
                    "location": "location",
                    "manager_username": "managerUsername"
                  }}
                  isUploading={bulkUploadMutation.isPending}
                  templateHeaders={[
                    "name", 
                    "location", 
                    "manager_username"
                  ]}
                  templateFilename="stores_template.csv"
                  instructions="Upload a CSV file with store names and locations to add stores in bulk. 
                    Required columns: name, location. Optional: manager_username (must be an existing manager's username)."
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
                            <TableHead>Store Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Manager</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvData.slice(0, 5).map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.location}</TableCell>
                              <TableCell>{item.managerUsername || "-"}</TableCell>
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
    </div>
  );
};

export default StoresPage;