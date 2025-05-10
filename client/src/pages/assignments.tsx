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
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { DataLoadError } from "@/components/ui/error-state";
import { 
  Loader2, 
  Plus, 
  Search, 
  User,
  Store,
  CalendarRange,
  ClipboardList,
  Check,
  X,
  Eye,
  Pencil,
  Trash,
  Calendar,
  ExternalLink,
  UserCog,
  Mail
} from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { StoreAssignment, User as UserType, UserRole, WorkItem, Store as StoreType, WorkItemType, insertStoreAssignmentSchema, insertWorkItemSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

// Convert API dates to readable format
const formatDate = (dateString: string | Date | null | undefined) => {
  if (!dateString) return "N/A";
  return format(new Date(dateString), "MMM d, yyyy");
};

const AssignmentsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const canManageAssignments = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;
  
  // State variables
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [isViewWorkItemsDialogOpen, setIsViewWorkItemsDialogOpen] = useState<boolean>(false);
  const [isCreateWorkItemDialogOpen, setIsCreateWorkItemDialogOpen] = useState<boolean>(false);
  const [selectedAssignment, setSelectedAssignment] = useState<StoreAssignmentWithRelations | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<string>("active");
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  
  // Add form schema for store assignment with work items
  const assignmentFormSchema = insertStoreAssignmentSchema.extend({
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
    stockTakeType: z.enum(['shelf', 'store', 'both']),
    workItems: z.array(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        type: z.string(),
        priority: z.string(),
        dueDate: z.coerce.date(),
      })
    ).optional(),
  });

  type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

  // Form for creating assignment
  const assignmentForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      userId: undefined,
      storeId: undefined,
      startDate: new Date(),
      endDate: null,
      status: "active",
      stockTakeType: "both", // Default to checking both shelf and store
      workItems: [] // No pre-filled work items
    }
  });

  // Work item form schema
  const workItemFormSchema = insertWorkItemSchema.extend({
    dueDate: z.coerce.date(),
  });

  type WorkItemFormValues = z.infer<typeof workItemFormSchema>;

  // Form for creating work item
  const workItemForm = useForm<WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "stock_take",
      priority: "medium",
      status: "pending",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // One week from now
    }
  });
  
  // User edit form schema
  const userEditFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email format"),
    role: z.enum([UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER]),
  });

  type UserEditFormValues = z.infer<typeof userEditFormSchema>;
  
  // Form for editing user
  const userEditForm = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: UserRole.MERCHANDISER,
    }
  });

  // Define expanded types for the store assignments with relations
type StoreAssignmentWithRelations = StoreAssignment & {
  store?: StoreType;
  user?: UserType;
};

// Queries for data fetching
  const { 
    data: allAssignments, 
    isLoading: isLoadingAssignments, 
    error: assignmentsError,
    refetch: refetchAssignments
  } = useQuery<StoreAssignmentWithRelations[]>({
    queryKey: ["/api/assignments"],
  });

  const { 
    data: activeAssignments, 
    isLoading: isLoadingActiveAssignments,
    error: activeAssignmentsError,
    refetch: refetchActiveAssignments
  } = useQuery<StoreAssignmentWithRelations[]>({
    queryKey: ["/api/assignments/active"],
  });

  const { 
    data: merchandisers, 
    isLoading: isLoadingMerchandisers,
    error: merchandisersError
  } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    select: (users) => users?.filter(user => user.role === UserRole.MERCHANDISER) || []
  });

  const { 
    data: stores, 
    isLoading: isLoadingStores,
    error: storesError
  } = useQuery<StoreType[]>({
    queryKey: ["/api/stores"],
  });

  // Mutation for creating an assignment
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormValues) => {
      const response = await apiRequest("POST", "/api/assignments", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment created",
        description: "Store assignment has been successfully created",
      });
      // Invalidate assignments queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/active"] });
      assignmentForm.reset();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to create assignment",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  });

  // Mutation for updating an assignment status
  const updateAssignmentStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const response = await apiRequest("PATCH", `/api/assignments/${id}`, { status });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment updated",
        description: "Assignment status has been successfully updated",
      });
      // Invalidate assignments queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/active"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update assignment",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  });

  // Mutation for deleting an assignment
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/assignments/${id}`);
      return response.ok;
    },
    onSuccess: () => {
      toast({
        title: "Assignment deleted",
        description: "Store assignment has been successfully deleted",
      });
      // Invalidate assignments queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/active"] });
      setIsDeleteDialogOpen(false);
      setSelectedAssignment(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete assignment",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  });

  // Mutation for creating work item
  const createWorkItemMutation = useMutation({
    mutationFn: async (data: WorkItemFormValues) => {
      const response = await apiRequest("POST", "/api/work-items", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Work item created",
        description: "Work item has been successfully created",
      });
      // Invalidate work items queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/work-items"] });
      if (selectedAssignment) {
        fetchWorkItems(selectedAssignment.id);
      }
      workItemForm.reset();
      setIsCreateWorkItemDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to create work item",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  });
  
  // Mutation for updating user
  const updateUserMutation = useMutation({
    mutationFn: async (userData: UserEditFormValues) => {
      const response = await apiRequest("PATCH", `/api/users/${selectedUser?.id}`, userData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "The user has been successfully updated.",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/active"] });
      
      setIsEditUserDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update user",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  });

  // Function to fetch work items for an assignment
  const fetchWorkItems = async (assignmentId: number) => {
    try {
      const response = await apiRequest("GET", `/api/assignments/${assignmentId}/work-items`);
      const data = await response.json();
      if (response.ok) {
        setWorkItems(data);
      } else {
        throw new Error(data.error || "Failed to fetch work items");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to fetch work items",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  // Handle assignment form submission
  const onSubmitAssignment = (values: AssignmentFormValues) => {
    // Ensure dates are properly coerced to Date objects before submission
    const formattedValues = {
      ...values,
      workItems: values.workItems?.map(item => ({
        ...item,
        // Ensure dueDate is a proper Date instance
        dueDate: item.dueDate instanceof Date ? item.dueDate : new Date(item.dueDate as any)
      }))
    };
    
    console.log("Submitting form values:", formattedValues);
    createAssignmentMutation.mutate(formattedValues);
  };
  
  // Debug function to check form state
  const debugForm = () => {
    console.log("Form values:", assignmentForm.getValues());
    console.log("Form errors:", assignmentForm.formState.errors);
    console.log("Form is valid:", assignmentForm.formState.isValid);
    
    // Manual submission if the form appears valid
    if (Object.keys(assignmentForm.formState.errors).length === 0) {
      const values = assignmentForm.getValues();
      onSubmitAssignment(values);
    }
  };

  // Handle work item form submission
  const onSubmitWorkItem = (values: WorkItemFormValues) => {
    if (!selectedAssignment) return;
    
    const workItemData = {
      ...values,
      storeAssignmentId: selectedAssignment.id,
      storeId: selectedAssignment.storeId,
      userId: selectedAssignment.userId,
    };
    
    createWorkItemMutation.mutate(workItemData);
  };

  // Handle opening the view work items dialog
  const handleViewWorkItems = (assignment: StoreAssignmentWithRelations) => {
    setSelectedAssignment(assignment);
    fetchWorkItems(assignment.id);
    setIsViewWorkItemsDialogOpen(true);
  };

  // Handle opening create work item dialog
  const handleOpenCreateWorkItem = () => {
    if (!selectedAssignment) return;
    
    // Set default values
    workItemForm.setValue("storeId", selectedAssignment.storeId);
    workItemForm.setValue("userId", selectedAssignment.userId);
    workItemForm.setValue("storeAssignmentId", selectedAssignment.id);
    
    setIsCreateWorkItemDialogOpen(true);
  };

  // Handle opening delete dialog
  const handleOpenDeleteDialog = (assignment: StoreAssignmentWithRelations) => {
    setSelectedAssignment(assignment);
    setIsDeleteDialogOpen(true);
  };

  // Handle delete assignment
  const handleDeleteAssignment = () => {
    if (!selectedAssignment) return;
    deleteAssignmentMutation.mutate(selectedAssignment.id);
  };

  // Handle completing an assignment
  const handleCompleteAssignment = (assignment: StoreAssignmentWithRelations) => {
    updateAssignmentStatusMutation.mutate({ id: assignment.id, status: "completed" });
  };

  // Handle cancelling an assignment
  const handleCancelAssignment = (assignment: StoreAssignmentWithRelations) => {
    updateAssignmentStatusMutation.mutate({ id: assignment.id, status: "cancelled" });
  };
  
  // Handle opening the edit user dialog
  const handleEditUser = (assignment: StoreAssignmentWithRelations) => {
    if (!assignment.user) return;
    
    setSelectedUser(assignment.user);
    
    // Reset form with user data
    userEditForm.reset({
      name: assignment.user.name,
      email: assignment.user.email,
      role: assignment.user.role as UserRole, // Explicit cast to UserRole
    });
    
    setIsEditUserDialogOpen(true);
  };
  
  // Handle submitting the edit user form
  const onSubmitEditUser = (values: UserEditFormValues) => {
    if (!selectedUser) return;
    updateUserMutation.mutate(values);
  };

  // Filter assignments based on search query
  const filterAssignments = (assignments: StoreAssignmentWithRelations[] | undefined) => {
    if (!assignments) return [];
    
    return assignments.filter(assignment => {
      const store = assignment.store?.name?.toLowerCase() || "";
      const user = assignment.user?.name?.toLowerCase() || "";
      const query = searchQuery.toLowerCase();
      
      return store.includes(query) || user.includes(query);
    });
  };

  // Get assignments based on selected tab
  const getAssignmentsByTab = () => {
    if (selectedTab === "active") {
      return filterAssignments(activeAssignments);
    } else {
      return filterAssignments(allAssignments);
    }
  };

  // Determine if UI is in loading state
  const isLoading = isLoadingAssignments || isLoadingActiveAssignments;

  // Determine if there was an error loading data
  const hasError = assignmentsError || activeAssignmentsError;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Store Assignments</h1>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={!canManageAssignments || isLoadingMerchandisers || isLoadingStores}
        >
          <Plus className="h-4 w-4 mr-2" /> Create Assignment
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Store Assignments</CardTitle>
          <CardDescription>
            Manage the assignments of merchandisers to stores. Each assignment can have one or more work items associated with it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by store or merchandiser name..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <Tabs
              value={selectedTab}
              onValueChange={setSelectedTab}
              className="flex-shrink-0"
            >
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : hasError ? (
            <DataLoadError 
              entityName="assignments" 
              retryAction={selectedTab === "active" ? refetchActiveAssignments : refetchAssignments} 
            />
          ) : getAssignmentsByTab()?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 p-4 bg-muted rounded-full">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No assignments found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery 
                  ? "Try adjusting your search" 
                  : selectedTab === "active"
                    ? "There are no active assignments at the moment"
                    : "Add your first assignment to get started"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Merchandiser</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getAssignmentsByTab()?.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.store?.name || 'Unknown Store'}</TableCell>
                      <TableCell>{assignment.user?.name || 'Unknown User'}</TableCell>
                      <TableCell>{formatDate(assignment.startDate)}</TableCell>
                      <TableCell>{formatDate(assignment.endDate)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            assignment.status === "active" ? "default" :
                            assignment.status === "completed" ? "success" :
                            "destructive"
                          }
                        >
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{assignment.assignedBy === user?.id ? 'You' : 'Admin'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewWorkItems(assignment)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Work Items</TooltipContent>
                          </Tooltip>
                          
                          {assignment.status === "active" && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCompleteAssignment(assignment)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mark as Completed</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCancelAssignment(assignment)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cancel Assignment</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          
                          {isAdmin && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditUser(assignment)}
                                  >
                                    <UserCog className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit User</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenDeleteDialog(assignment)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Assignment</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Assignment Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Store Assignment</DialogTitle>
            <DialogDescription>
              Assign a merchandiser to a store and optionally create work items for them.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(onSubmitAssignment)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={assignmentForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Merchandiser</FormLabel>
                      <FormControl>
                        <Combobox
                          value={field.value?.toString() || ""}
                          onChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                          placeholder="Select a merchandiser"
                          loading={isLoadingMerchandisers}
                          emptyMessage={
                            merchandisersError 
                              ? "Failed to load merchandisers" 
                              : merchandisers?.length === 0 
                                ? "No merchandisers available" 
                                : "No merchandisers found"
                          }
                          options={
                            merchandisers?.map((merchandiser) => ({
                              label: merchandiser.name,
                              value: merchandiser.id.toString()
                            })) || []
                          }
                          renderItem={(option) => (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-muted-foreground" />
                              {option.label}
                            </div>
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={assignmentForm.control}
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store</FormLabel>
                      <FormControl>
                        <Combobox
                          value={field.value?.toString() || ""}
                          onChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                          placeholder="Select a store"
                          loading={isLoadingStores}
                          emptyMessage={
                            storesError 
                              ? "Failed to load stores" 
                              : stores?.length === 0 
                                ? "No stores available" 
                                : "No stores found"
                          }
                          options={
                            stores?.map((store) => ({
                              label: store.name,
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={assignmentForm.control}
                name="stockTakeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Take Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stock take type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="shelf">Shelf Only</SelectItem>
                        <SelectItem value="store">Back Store Only</SelectItem>
                        <SelectItem value="both">Both Shelf and Back Store</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This controls which locations merchandisers will record inventory quantities for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={assignmentForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={assignmentForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => {
                              const startDate = assignmentForm.getValues("startDate");
                              return startDate && date < startDate;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Initial Work Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentWorkItems = assignmentForm.getValues("workItems") || [];
                      assignmentForm.setValue("workItems", [
                        ...currentWorkItems,
                        {
                          title: "",
                          description: "",
                          type: "stock_take",
                          priority: "medium",
                          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        }
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Work Item
                  </Button>
                </div>

                {assignmentForm.watch("workItems")?.map((_, index) => (
                  <div key={index} className="flex flex-col h-full p-4 border rounded-md relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        const currentWorkItems = assignmentForm.getValues("workItems") || [];
                        if (currentWorkItems.length > 1) {
                          assignmentForm.setValue("workItems", 
                            currentWorkItems.filter((_, i) => i !== index)
                          );
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    {/* Content area */}
                    <div className="space-y-4 flex-grow">
                      <FormField
                        control={assignmentForm.control}
                        name={`workItems.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Task title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={assignmentForm.control}
                        name={`workItems.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Task description"
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Bottom aligned controls */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <FormField
                        control={assignmentForm.control}
                        name={`workItems.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="stock_take">Stock Take</SelectItem>
                                <SelectItem value="inventory_count">Inventory Count</SelectItem>
                                <SelectItem value="merchandising">Merchandising</SelectItem>
                                <SelectItem value="order_placement">Order Placement</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={assignmentForm.control}
                        name={`workItems.${index}.priority`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={assignmentForm.control}
                        name={`workItems.${index}.dueDate`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Due Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={debugForm}
                  disabled={createAssignmentMutation.isPending}
                >
                  {createAssignmentMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Assignment
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Work Items Dialog */}
      <Dialog open={isViewWorkItemsDialogOpen} onOpenChange={setIsViewWorkItemsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Work Items for Assignment
            </DialogTitle>
            <DialogDescription>
              {selectedAssignment && (
                <>
                  <span className="font-medium">{selectedAssignment.store?.name}</span> - 
                  Assigned to <span className="font-medium">{selectedAssignment.user?.name}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Work Items</h3>
              
              {selectedAssignment?.status === "active" && (
                <Button 
                  onClick={handleOpenCreateWorkItem} 
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Work Item
                </Button>
              )}
            </div>

            {workItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 p-4 bg-muted rounded-full">
                  <ClipboardList className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No work items found</h3>
                <p className="text-muted-foreground mt-1">
                  This assignment doesn't have any work items yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {workItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-lg">{item.title}</h4>
                          <p className="text-muted-foreground text-sm">{item.description}</p>
                        </div>
                        <Badge
                          variant={
                            item.status === "completed" ? "success" :
                            item.status === "in_progress" ? "warning" :
                            "default"
                          }
                          className="ml-2"
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <Separator className="my-4" />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type:</span> 
                          <span className="ml-2 capitalize">{item.type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Priority:</span> 
                          <span className="ml-2 capitalize">{item.priority}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Due Date:</span> 
                          <span className="ml-2">{formatDate(item.dueDate)}</span>
                        </div>
                        {item.completedAt && (
                          <div>
                            <span className="text-muted-foreground">Completed:</span> 
                            <span className="ml-2">{formatDate(item.completedAt)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsViewWorkItemsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Work Item Dialog */}
      <Dialog open={isCreateWorkItemDialogOpen} onOpenChange={setIsCreateWorkItemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Work Item</DialogTitle>
            <DialogDescription>
              Create a new work item for this assignment.
            </DialogDescription>
          </DialogHeader>

          <Form {...workItemForm}>
            <form onSubmit={workItemForm.handleSubmit(onSubmitWorkItem)} className="space-y-4">
              <FormField
                control={workItemForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Task title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={workItemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Task description"
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        value={field.value || ''}
                        disabled={field.disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={workItemForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="stock_take">Stock Take</SelectItem>
                          <SelectItem value="inventory_count">Inventory Count</SelectItem>
                          <SelectItem value="merchandising">Merchandising</SelectItem>
                          <SelectItem value="order_placement">Order Placement</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={workItemForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={workItemForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateWorkItemDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createWorkItemMutation.isPending}
                >
                  {createWorkItemMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Work Item
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Assignment Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the assignment and all associated work items.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssignment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAssignmentMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Update information for <span className="font-medium">{selectedUser.name}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...userEditForm}>
            <form onSubmit={userEditForm.handleSubmit(onSubmitEditUser)} className="space-y-6">
              <FormField
                control={userEditForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userEditForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userEditForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                        <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
                        <SelectItem value={UserRole.MERCHANDISER}>Merchandiser</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignmentsPage;