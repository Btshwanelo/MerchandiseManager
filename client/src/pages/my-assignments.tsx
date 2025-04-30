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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  ArrowUpDown,
  Building2,
  Clock
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { WorkItemStatus, WorkItemType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

dayjs.extend(relativeTime);

type StoreType = {
  id: number;
  name: string;
  location: string;
};

type UserType = {
  id: number;
  username: string;
  role: string;
};

type StoreAssignment = {
  id: number;
  userId: number;
  storeId: number;
  assignedAt: Date;
  role: string;
  status: string;
};

type WorkItem = {
  id: number;
  title: string;
  description: string;
  storeId: number;
  userId: number;
  assignmentId: number;
  type: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  notes: string | null;
};

type WorkItemWithRelations = WorkItem & {
  store?: StoreType;
  user?: UserType;
};

const MyAssignmentsPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isWorkItemDialogOpen, setIsWorkItemDialogOpen] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItemWithRelations | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  
  // Fetch work items
  const { 
    data: workItems, 
    isLoading: isLoadingWorkItems, 
    error: workItemsError
  } = useQuery({
    queryKey: ['/api/my-work-items'],
    select: (data: WorkItemWithRelations[]) => data
  });
  
  // Work item status update mutation
  const updateWorkItemStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const res = await apiRequest("PUT", `/api/work-items/${id}/status`, { status, notes });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      setIsWorkItemDialogOpen(false);
      setCompletionNotes("");
      
      toast({
        title: "Work item updated",
        description: "The work item status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update work item: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
    },
  });
  
  const handleStartWorkItem = (workItem: WorkItemWithRelations) => {
    updateWorkItemStatusMutation.mutate({
      id: workItem.id,
      status: WorkItemStatus.IN_PROGRESS
    });
  };
  
  const handleOpenCompleteDialog = (workItem: WorkItemWithRelations) => {
    setSelectedWorkItem(workItem);
    setIsWorkItemDialogOpen(true);
  };
  
  const handleCompleteWorkItem = () => {
    if (!selectedWorkItem) return;
    
    updateWorkItemStatusMutation.mutate({
      id: selectedWorkItem.id,
      status: WorkItemStatus.COMPLETED,
      notes: completionNotes
    });
  };
  
  const handleWorkItemClick = (workItem: WorkItemWithRelations) => {
    // For stock_take work items, navigate to the stock take page
    if (workItem.type === WorkItemType.STOCK_TAKE) {
      navigate(`/stock-take?storeId=${workItem.storeId}`);
    }
    // Add handling for other work item types as needed
  };
  
  const filterWorkItems = (items: WorkItemWithRelations[] | undefined, status: string, search: string) => {
    if (!items) return [];
    
    return items
      .filter(item => 
        (status === "active" 
          ? item.status !== WorkItemStatus.COMPLETED 
          : item.status === WorkItemStatus.COMPLETED) &&
        (search === "" || 
          (item.title.toLowerCase().includes(search.toLowerCase()) ||
           item.store?.name.toLowerCase().includes(search.toLowerCase())))
      )
      .sort((a, b) => {
        // Sort by due date (if available)
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        } else if (a.dueDate) {
          return -1;
        } else if (b.dueDate) {
          return 1;
        }
        
        // Sort by priority if no due date
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        const priorityA = priorityOrder[a.priority.toLowerCase()] || 99;
        const priorityB = priorityOrder[b.priority.toLowerCase()] || 99;
        
        return priorityA - priorityB;
      });
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return "text-red-500";
      case 'medium':
        return "text-orange-500";
      case 'low':
        return "text-green-500";
      default:
        return "text-slate-500";
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case WorkItemStatus.PENDING:
        return <Badge variant="outline" className="bg-slate-100">Pending</Badge>;
      case WorkItemStatus.IN_PROGRESS:
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case WorkItemStatus.COMPLETED:
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (isLoadingWorkItems) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (workItemsError) {
    return (
      <DataLoadError 
        title="Error loading work items" 
        message="Failed to load your assigned tasks. Please try again later."
      />
    );
  }
  
  const activeItems = filterWorkItems(workItems, "active", searchTerm);
  const completedItems = filterWorkItems(workItems, "completed", searchTerm);
  
  return (
    <div className="container py-6 max-w-screen-xl">
      <div className="flex flex-col mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Work Items</h1>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <p className="text-muted-foreground">Work that has been assigned to you</p>
      </div>
      
      <Card className="mb-8">
        <CardContent className="p-6">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="space-y-4">
              {activeItems.length > 0 ? (
                <div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">
                            <div className="flex items-center space-x-1">
                              <span>Task</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead>Store</TableHead>
                          <TableHead>
                            <div className="flex items-center space-x-1">
                              <span>Status</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center space-x-1">
                              <span>Due date</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              <div 
                                className="cursor-pointer hover:text-primary"
                                onClick={() => handleWorkItemClick(item)}
                              >
                                {item.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {item.description}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                {item.store?.name}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell>
                              {item.dueDate ? (
                                <div className="flex items-center space-x-1">
                                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>{dayjs(item.dueDate).format('DD/MM/YYYY')}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs font-semibold ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {item.status === WorkItemStatus.PENDING && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStartWorkItem(item)}
                                  disabled={updateWorkItemStatusMutation.isPending}
                                >
                                  Start
                                </Button>
                              )}
                              
                              {item.status === WorkItemStatus.IN_PROGRESS && item.type !== 'stock_take' && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleOpenCompleteDialog(item)}
                                  disabled={updateWorkItemStatusMutation.isPending}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Complete
                                </Button>
                              )}
                              
                              {item.status === WorkItemStatus.IN_PROGRESS && item.type === 'stock_take' && (
                                <div className="px-2 py-1 text-xs text-muted-foreground bg-muted rounded-md">
                                  Auto-completed on submission
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing <strong>{activeItems.length}</strong> items
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" disabled>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Info className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium">No active work items</h3>
                  <p className="text-muted-foreground">You don't have any active work items assigned to you</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              {completedItems.length > 0 ? (
                <div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">
                            <div className="flex items-center space-x-1">
                              <span>Task</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead>Store</TableHead>
                          <TableHead>
                            <div className="flex items-center space-x-1">
                              <span>Completed</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              <div>{item.title}</div>
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {item.description}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                {item.store?.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{item.completedAt ? dayjs(item.completedAt).format('DD/MM/YYYY') : '—'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.notes ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger className="text-left">
                                      <div className="line-clamp-1 text-sm">{item.notes}</div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-md">{item.notes}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing <strong>{completedItems.length}</strong> items
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" disabled>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Info className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium">No completed items</h3>
                  <p className="text-muted-foreground">You haven't completed any work items yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
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