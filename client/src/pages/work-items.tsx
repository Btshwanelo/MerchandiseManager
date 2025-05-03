import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { 
  Loader2, 
  Plus, 
  Filter,
  FileText,
  Eye,
  Store,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { WorkItemStatus, WorkItemType, UserRole } from "@shared/schema";

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

type WorkItemFilterState = {
  search: string;
  status: string;
  storeId: string;
  userId: string;
};

const WorkItemsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // States for filtering and view
  const [filters, setFilters] = useState<WorkItemFilterState>({
    search: "",
    status: "all",
    storeId: "",
    userId: "",
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
  
  // Store input values for creating a new work item (store assignment)
  const [newAssignmentData, setNewAssignmentData] = useState({
    userId: "",
    storeId: "",
    workTitle: "",
    workDescription: ""
  });

  // Fetch work items (will be filtered on the client side)
  const { 
    data: workItems = [], 
    isLoading: isLoadingWorkItems,
    error: workItemsError,
    refetch: refetchWorkItems
  } = useQuery<WorkItem[]>({
    queryKey: ['/api/work-items'],
    enabled: !!user && user.role === UserRole.ADMIN
  });

  // Fetch stores for filtering and assignment creation
  const { 
    data: stores = [],
    isLoading: isLoadingStores 
  } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
    enabled: !!user && user.role === UserRole.ADMIN
  });

  // Fetch merchandisers for filtering and assignment creation
  const { 
    data: merchandisers = [],
    isLoading: isLoadingMerchandisers 
  } = useQuery<User[]>({
    queryKey: ['/api/users/merchandisers'],
    enabled: !!user && user.role === UserRole.ADMIN
  });

  // Create store assignment with work item mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/assignments", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "New work item created successfully",
      });
      refetchWorkItems();
      setCreateDialogOpen(false);
      resetNewAssignmentForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create work item: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle creating a new store assignment with work item
  const handleCreateWorkItem = () => {
    if (!newAssignmentData.userId || !newAssignmentData.storeId || !newAssignmentData.workTitle) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Create a store assignment with a work item
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    createAssignmentMutation.mutate({
      userId: parseInt(newAssignmentData.userId),
      storeId: parseInt(newAssignmentData.storeId),
      assignedBy: user?.id,
      startDate: new Date().toISOString(),
      status: "active",
      stockTakeType: "both",
      workItems: [
        {
          title: newAssignmentData.workTitle,
          description: newAssignmentData.workDescription || null,
          type: WorkItemType.PROCESS_FORM,
          priority: "medium",
          dueDate: oneWeekFromNow.toISOString(),
        }
      ]
    });
  };

  // Reset the form for creating a new assignment
  const resetNewAssignmentForm = () => {
    setNewAssignmentData({
      userId: "",
      storeId: "",
      workTitle: "",
      workDescription: ""
    });
  };

  // Handle opening work item details
  const handleViewWorkItem = (workItem: WorkItem) => {
    setLocation(`/work-item-detail/${workItem.id}`);
  };

  // Apply filters to work items
  const filteredWorkItems = workItems.filter(item => {
    // Filter by search term (title, description, store name, username)
    const searchMatch = !filters.search || 
      item.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(filters.search.toLowerCase())) ||
      (item.store?.name && item.store.name.toLowerCase().includes(filters.search.toLowerCase())) ||
      (item.user?.name && item.user.name.toLowerCase().includes(filters.search.toLowerCase()));
    
    // Filter by status
    const statusMatch = filters.status === 'all' || item.status === filters.status;
    
    // Filter by store
    const storeMatch = filters.storeId === 'all' || item.storeId.toString() === filters.storeId;
    
    // Filter by user (merchandiser)
    const userMatch = filters.userId === 'all' || item.userId.toString() === filters.userId;
    
    return searchMatch && statusMatch && storeMatch && userMatch;
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

  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
              <p className="text-muted-foreground">
                Only administrators can access the Work Items page.
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Work Items</h1>
          <p className="text-muted-foreground">
            Manage and track work items across all stores and merchandisers
          </p>
        </div>
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          disabled={isLoadingWorkItems}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Work Item
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search work items..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full"
              />
            </div>
            <div>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({...filters, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={WorkItemStatus.PENDING || "pending"}>Pending</SelectItem>
                  <SelectItem value={WorkItemStatus.IN_PROGRESS || "in_progress"}>In Progress</SelectItem>
                  <SelectItem value={WorkItemStatus.COMPLETED || "completed"}>Completed</SelectItem>
                  <SelectItem value={WorkItemStatus.CANCELLED || "cancelled"}>Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={filters.storeId}
                onValueChange={(value) => setFilters({...filters, storeId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id.toString()}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={filters.userId}
                onValueChange={(value) => setFilters({...filters, userId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by merchandiser" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Merchandisers</SelectItem>
                  {merchandisers.map((merchandiser) => (
                    <SelectItem key={merchandiser.id} value={merchandiser.id.toString()}>
                      {merchandiser.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Items Table */}
      <Card>
        <CardContent className="p-0">
          {isLoadingWorkItems ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : workItemsError ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p>Failed to load work items. Please try again.</p>
            </div>
          ) : filteredWorkItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No work items found</p>
              <p className="text-sm">Try adjusting your filters or create a new work item.</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Merchandiser</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Completed At</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {item.title}
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {item.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Store className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{item.store?.name || `Store #${item.storeId}`}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{item.user?.name || `User #${item.userId}`}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{formatDate(item.dueDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.completedAt ? (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{formatDate(item.completedAt)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not completed</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.type.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewWorkItem(item)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
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

      {/* Create Work Item Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Work Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="merchandiser" className="text-sm font-medium">
                Assign Merchandiser
              </label>
              <Select
                value={newAssignmentData.userId}
                onValueChange={(value) => setNewAssignmentData({...newAssignmentData, userId: value})}
              >
                <SelectTrigger id="merchandiser">
                  <SelectValue placeholder="Select merchandiser" />
                </SelectTrigger>
                <SelectContent>
                  {merchandisers.map((merchandiser) => (
                    <SelectItem key={merchandiser.id} value={merchandiser.id.toString()}>
                      {merchandiser.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="store" className="text-sm font-medium">
                Select Store
              </label>
              <Select
                value={newAssignmentData.storeId}
                onValueChange={(value) => setNewAssignmentData({...newAssignmentData, storeId: value})}
              >
                <SelectTrigger id="store">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id.toString()}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="workTitle" className="text-sm font-medium">
                Work Item Title
              </label>
              <Input
                id="workTitle"
                placeholder="Enter title"
                value={newAssignmentData.workTitle}
                onChange={(e) => setNewAssignmentData({...newAssignmentData, workTitle: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="workDescription" className="text-sm font-medium">
                Description (Optional)
              </label>
              <Input
                id="workDescription"
                placeholder="Enter description"
                value={newAssignmentData.workDescription}
                onChange={(e) => setNewAssignmentData({...newAssignmentData, workDescription: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetNewAssignmentForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateWorkItem}
              disabled={createAssignmentMutation.isPending}
            >
              {createAssignmentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Work Item
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkItemsPage;