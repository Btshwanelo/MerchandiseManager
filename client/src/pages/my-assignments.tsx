import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DataLoadError } from "@/components/ui/error-state";
import { 
  Loader2, 
  Search, 
  Store,
  ClipboardList,
  CheckCircle2,
  ClipboardCheck,
  Calendar,
  AlertCircle,
  Clock,
  Tag,
  User,
  ArrowUpRight,
  ExternalLink
} from "lucide-react";
import { StoreAssignment, WorkItem, WorkItemStatus, UserRole, Store as StoreType, User as UserType } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

// Define extended types with relations
type StoreAssignmentWithRelations = StoreAssignment & {
  store?: StoreType;
  user?: UserType;
};

type WorkItemWithRelations = WorkItem & {
  store?: StoreType;
  user?: UserType;
};

// Convert API dates to readable format
const formatDate = (dateString: string | Date | null | undefined) => {
  if (!dateString) return "N/A";
  return format(new Date(dateString), "MMM d, yyyy");
};

const MyAssignmentsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // State variables
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<string>("active");
  const [selectedAssignment, setSelectedAssignment] = useState<StoreAssignmentWithRelations | null>(null);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItemWithRelations | null>(null);
  const [isWorkItemDialogOpen, setIsWorkItemDialogOpen] = useState<boolean>(false);
  const [completionNotes, setCompletionNotes] = useState<string>("");
  
  // Queries for data fetching
  const { 
    data: assignmentsByUser, 
    isLoading: isLoadingAssignments,
    error: assignmentsError,
    refetch: refetchAssignments
  } = useQuery<StoreAssignmentWithRelations[]>({
    queryKey: ["/api/my-assignments"],
    enabled: !!user?.id,
  });

  const { 
    data: workItemsByUser, 
    isLoading: isLoadingWorkItems,
    error: workItemsError,
    refetch: refetchWorkItems
  } = useQuery<WorkItemWithRelations[]>({
    queryKey: ["/api/my-work-items"],
    enabled: !!user?.id,
  });

  // Mutation for updating a work item status
  const updateWorkItemStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number, status: string, notes?: string }) => {
      const response = await apiRequest("PATCH", `/api/work-items/${id}`, { 
        status, 
        notes,
        completedAt: status === WorkItemStatus.COMPLETED ? new Date().toISOString() : null
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Work item updated",
        description: "Work item status has been successfully updated",
      });
      // Invalidate work items query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/my-work-items"] });
      setIsWorkItemDialogOpen(false);
      setSelectedWorkItem(null);
      setCompletionNotes("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update work item",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  });

  // Filter assignments and work items based on search query
  const filteredAssignments = assignmentsByUser?.filter(assignment => {
    const store = assignment.store?.name?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return store.includes(query);
  });

  const filteredWorkItems = workItemsByUser?.filter(item => {
    const title = item.title?.toLowerCase() || "";
    const description = item.description?.toLowerCase() || "";
    const storeName = item.store?.name?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    
    return title.includes(query) || description.includes(query) || storeName.includes(query);
  });

  // Get active assignments and work items
  const activeAssignments = filteredAssignments?.filter(
    assignment => assignment.status === "active"
  );
  
  const activeWorkItems = filteredWorkItems?.filter(
    item => item.status !== WorkItemStatus.COMPLETED && item.status !== WorkItemStatus.CANCELLED
  );

  // Get completed assignments and work items
  const completedAssignments = filteredAssignments?.filter(
    assignment => assignment.status === "completed" || assignment.status === "cancelled"
  );
  
  const completedWorkItems = filteredWorkItems?.filter(
    item => item.status === WorkItemStatus.COMPLETED || item.status === WorkItemStatus.CANCELLED
  );

  // Determine which assignments and work items to display based on the selected tab
  const displayedAssignments = selectedTab === "active" ? activeAssignments : completedAssignments;
  const displayedWorkItems = selectedTab === "active" ? activeWorkItems : completedWorkItems;

  // Handle starting a work item
  const handleStartWorkItem = (workItem: WorkItemWithRelations) => {
    updateWorkItemStatusMutation.mutate({ 
      id: workItem.id, 
      status: WorkItemStatus.IN_PROGRESS 
    });
  };

  // Handle opening the complete work item dialog
  const handleOpenCompleteDialog = (workItem: WorkItemWithRelations) => {
    setSelectedWorkItem(workItem);
    setIsWorkItemDialogOpen(true);
  };

  // Handle completing a work item
  const handleCompleteWorkItem = () => {
    if (!selectedWorkItem) return;
    
    updateWorkItemStatusMutation.mutate({ 
      id: selectedWorkItem.id, 
      status: WorkItemStatus.COMPLETED,
      notes: completionNotes
    });
  };
  
  // Handle work item row click to navigate to stock take
  const handleWorkItemClick = (workItem: WorkItemWithRelations) => {
    // Navigate to stock take page with the store ID
    if (workItem.type === "stock_take" && workItem.storeId) {
      navigate(`/stock-take/${workItem.storeId}`);
    }
  };

  // Determine loading and error states
  const isLoading = isLoadingAssignments || isLoadingWorkItems;
  const hasError = assignmentsError || workItemsError;

  // Get work items for a specific assignment
  const getWorkItemsForAssignment = (assignmentId: number) => {
    return workItemsByUser?.filter(item => item.storeAssignmentId === assignmentId) || [];
  };

  // Function to render work item priority badge
  const renderPriorityBadge = (priority: string) => {
    let variant: "default" | "destructive" | "outline" | "secondary" | "success" | "warning" = "default";
    if (priority === "high") variant = "destructive";
    if (priority === "low") variant = "outline";
    
    return (
      <Badge variant={variant} className="capitalize">
        {priority}
      </Badge>
    );
  };

  // Function to render work item status badge
  const renderStatusBadge = (status: string) => {
    let variant: "default" | "destructive" | "outline" | "secondary" | "success" | "warning" = "default";
    if (status === WorkItemStatus.COMPLETED) variant = "success";
    if (status === WorkItemStatus.IN_PROGRESS) variant = "warning";
    if (status === WorkItemStatus.CANCELLED) variant = "destructive";
    
    return (
      <Badge variant={variant} className="capitalize">
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Assignments</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by store name or task description..."
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
            <TabsTrigger value="completed">Completed</TabsTrigger>
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
          retryAction={() => {
            refetchAssignments();
            refetchWorkItems();
          }} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Store Assignments Panel */}
          <div className="md:col-span-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Store Assignments</CardTitle>
                <CardDescription>
                  Stores you are assigned to visit
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!displayedAssignments || displayedAssignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="mb-4 p-4 bg-muted rounded-full">
                      <Store className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">No store assignments</h3>
                    <p className="text-muted-foreground mt-1">
                      {searchQuery ? "Try adjusting your search" : "You don't have any store assignments"}
                    </p>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {displayedAssignments.map((assignment) => {
                      const workItems = getWorkItemsForAssignment(assignment.id);
                      const pendingWorkItems = workItems.filter(i => i.status === WorkItemStatus.PENDING);
                      const inProgressWorkItems = workItems.filter(i => i.status === WorkItemStatus.IN_PROGRESS);
                      const completedWorkItems = workItems.filter(i => i.status === WorkItemStatus.COMPLETED);
                      
                      return (
                        <AccordionItem key={assignment.id} value={`assignment-${assignment.id}`}>
                          <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                            <div className="flex items-center justify-between w-full mr-4">
                              <div className="font-medium">{assignment.store?.name}</div>
                              <Badge variant={assignment.status === 'active' ? 'default' : 'destructive'}>
                                {assignment.status}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4">
                            <div className="space-y-4 py-2">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Start Date:</span>
                                  <span className="ml-2">{formatDate(assignment.startDate)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">End Date:</span>
                                  <span className="ml-2">{formatDate(assignment.endDate)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Location:</span>
                                  <span className="ml-2">{assignment.store?.location}</span>
                                </div>
                              </div>
                              
                              <Separator />
                              
                              <div>
                                <h4 className="text-sm font-medium mb-2">Work Items</h4>
                                <div className="space-y-2">
                                  {workItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No work items for this assignment</p>
                                  ) : (
                                    <div className="grid grid-cols-3 gap-2 text-sm text-center">
                                      <div className="flex flex-col items-center p-2 bg-muted rounded-md">
                                        <div className="text-lg font-bold">{pendingWorkItems.length}</div>
                                        <div className="text-muted-foreground">Pending</div>
                                      </div>
                                      <div className="flex flex-col items-center p-2 bg-muted rounded-md">
                                        <div className="text-lg font-bold">{inProgressWorkItems.length}</div>
                                        <div className="text-muted-foreground">In Progress</div>
                                      </div>
                                      <div className="flex flex-col items-center p-2 bg-muted rounded-md">
                                        <div className="text-lg font-bold">{completedWorkItems.length}</div>
                                        <div className="text-muted-foreground">Completed</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Work Items Panel */}
          <div className="md:col-span-7">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Work Items</CardTitle>
                <CardDescription>
                  Tasks that need to be completed at your assigned stores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!displayedWorkItems || displayedWorkItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="mb-4 p-4 bg-muted rounded-full">
                      <ClipboardList className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">No work items</h3>
                    <p className="text-muted-foreground mt-1">
                      {searchQuery ? "Try adjusting your search" : "You don't have any work items assigned"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayedWorkItems.map((workItem) => (
                      <Card 
                        key={workItem.id} 
                        className={`overflow-hidden ${workItem.type === 'stock_take' ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''}`}
                        onClick={workItem.type === 'stock_take' ? () => handleWorkItemClick(workItem) : undefined}
                      >
                        <div className={`h-1.5 w-full ${
                          workItem.priority === 'high' ? "bg-destructive" :
                          workItem.priority === 'medium' ? "bg-amber-500" :
                          "bg-emerald-500"
                        }`}></div>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-start">
                                <h4 className="font-medium text-lg">{workItem.title}</h4>
                                {workItem.type === 'stock_take' && (
                                  <ArrowUpRight className="h-4 w-4 ml-2 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Store className="h-4 w-4 mr-1" />
                                <span>{workItem.store?.name}</span>
                              </div>
                              <p className="text-muted-foreground text-sm mt-2">
                                {workItem.description || "No description provided"}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              {renderStatusBadge(workItem.status)}
                              {renderPriorityBadge(workItem.priority)}
                            </div>
                          </div>
                          
                          <Separator className="my-4" />
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm mb-4">
                            <div className="flex items-center">
                              <Tag className="h-4 w-4 mr-1 text-muted-foreground" />
                              <span className="capitalize">{workItem.type.replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                              <span>Due: {formatDate(workItem.dueDate)}</span>
                            </div>
                            {workItem.completedAt && (
                              <div className="flex items-center">
                                <CheckCircle2 className="h-4 w-4 mr-1 text-muted-foreground" />
                                <span>Completed: {formatDate(workItem.completedAt)}</span>
                              </div>
                            )}
                          </div>
                          
                          {selectedTab === "active" && (
                            <div className="flex justify-end gap-2">
                              {workItem.status === WorkItemStatus.PENDING && (
                                <Button
                                  variant="outline"
                                  onClick={() => handleStartWorkItem(workItem)}
                                  disabled={updateWorkItemStatusMutation.isPending}
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  Start Work
                                </Button>
                              )}
                              
                              {workItem.status === WorkItemStatus.IN_PROGRESS && (
                                <Button
                                  variant="default"
                                  onClick={() => handleOpenCompleteDialog(workItem)}
                                  disabled={updateWorkItemStatusMutation.isPending}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Complete
                                </Button>
                              )}
                            </div>
                          )}
                          
                          {selectedTab === "completed" && workItem.notes && (
                            <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                              <p className="font-medium mb-1">Completion Notes:</p>
                              <p>{workItem.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Complete Work Item Dialog */}
      <Dialog open={isWorkItemDialogOpen} onOpenChange={setIsWorkItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Work Item</DialogTitle>
            <DialogDescription>
              Add any notes about the completed task before submitting.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <h3 className="font-medium">Task Details</h3>
              <p className="text-muted-foreground text-sm">{selectedWorkItem?.title}</p>
              <p className="text-sm">{selectedWorkItem?.description}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Completion Notes
              </label>
              <Textarea
                id="notes"
                placeholder="Add any notes about the completed task..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsWorkItemDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteWorkItem}
              disabled={updateWorkItemStatusMutation.isPending}
            >
              {updateWorkItemStatusMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Mark as Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAssignmentsPage;