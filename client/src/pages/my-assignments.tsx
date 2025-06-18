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
import { 
  Loader2, 
  Search, 
  Store,
  ClipboardList,
  CheckCircle2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  ArrowUpDown,
  Building2,
  Clock,
  HelpCircle
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
    select: (data: WorkItemWithRelations[]) => {
      // Return all work items and let the component handle filtering
      return data.sort((a, b) => {
        // Sort completed items last, then by due date
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        
        // For items with same completion status, sort by due date
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return aDate - bDate;
      });
    }
  });
  
  // Work item status update mutation
  const updateWorkItemStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const res = await apiRequest("PUT", `/api/work-items/${id}/status`, { status, notes });
      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      setIsWorkItemDialogOpen(false);
      setCompletionNotes("");
      
      // If status was updated to in_progress, navigate to the process form
      if (variables.status === WorkItemStatus.IN_PROGRESS) {
        // Find the workItem using the id from variables
        const workItem = workItems?.find(item => item.id === variables.id);
        if (workItem) {
          console.log("Navigating to process form with:", {
            workItemId: workItem.id,
            storeId: workItem.storeId
          });
          // Force a delay before navigation to ensure the status update is complete
          setTimeout(() => {
            // All work items should navigate to the process form
            navigate(`/process-form?workItemId=${workItem.id}&storeId=${workItem.storeId}`);
          }, 100);
        }
      }
      
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
  
  const handleStartWorkItem = async (workItem: WorkItemWithRelations) => {
    try {
      // Make the API call directly instead of using the mutation
      const res = await apiRequest("PUT", `/api/work-items/${workItem.id}/status`, { 
        status: WorkItemStatus.IN_PROGRESS 
      });
      await res.json();
      
      // Manually invalidate the cache
      queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      
      // Show success toast
      toast({
        title: "Work item updated",
        description: "The work item status has been updated successfully.",
      });
      
      // Navigate to process form directly after API call finishes
      console.log("Navigating to process form with workItemId:", workItem.id, "storeId:", workItem.storeId);
      navigate(`/process-form?workItemId=${workItem.id}&storeId=${workItem.storeId}`);
      
    } catch (error) {
      console.error("Error updating work item:", error);
      toast({
        title: "Error",
        description: `Failed to update work item: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
    }
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
    if (!workItem || !workItem.id || !workItem.storeId) {
      console.error("Invalid work item data for navigation:", workItem);
      toast({
        title: "Navigation error",
        description: "This work item has missing required information",
        variant: "destructive"
      });
      return;
    }
    
    // Make sure both parameters are valid numbers
    const workItemId = parseInt(String(workItem.id));
    const storeId = parseInt(String(workItem.storeId));
    
    if (isNaN(workItemId) || isNaN(storeId)) {
      console.error("Invalid work item IDs:", { workItemId, storeId, workItem });
      toast({
        title: "Navigation error",
        description: "This work item has invalid ID information",
        variant: "destructive"
      });
      return;
    }
    
    // Check if the work item is completed
    if (workItem.status === WorkItemStatus.COMPLETED) {
      // Navigate to the summary page for completed work items
      navigate(`/work-item-summary/${workItemId}`);
      console.log(`Navigating to work item summary for completed item ${workItemId}`);
    } else {
      // Direct active work items to the process form with validated parameters
      navigate(`/process-form?workItemId=${workItemId}&storeId=${storeId}`);
      console.log(`Navigating to process form with workItemId=${workItemId}, storeId=${storeId}`);
    }
  };
  
  const filterWorkItems = (items: WorkItemWithRelations[] | undefined, status: string, search: string) => {
    if (!items) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow
    
    return items
      .filter(item => {
        // Basic status filter
        const statusMatch = status === "active" 
          ? item.status !== WorkItemStatus.COMPLETED 
          : item.status === WorkItemStatus.COMPLETED;
        
        // Search filter
        const searchMatch = search === "" || 
          (item.title.toLowerCase().includes(search.toLowerCase()) ||
           item.store?.name.toLowerCase().includes(search.toLowerCase()));
        
        // For active items, only show today's tasks or overdue tasks
        if (status === "active" && item.dueDate) {
          const dueDate = new Date(item.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          
          // Show if due today or overdue (before today)
          const isDueToday = dueDate.getTime() === today.getTime();
          const isOverdue = dueDate.getTime() < today.getTime();
          
          return statusMatch && searchMatch && (isDueToday || isOverdue);
        }
        
        // For completed items, show all that match other filters
        return statusMatch && searchMatch;
      })
      .sort((a, b) => {
        // Sort overdue items first, then today's items
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (a.dueDate && b.dueDate) {
          const dueDateA = new Date(a.dueDate);
          const dueDateB = new Date(b.dueDate);
          dueDateA.setHours(0, 0, 0, 0);
          dueDateB.setHours(0, 0, 0, 0);
          
          const isOverdueA = dueDateA.getTime() < today.getTime();
          const isOverdueB = dueDateB.getTime() < today.getTime();
          
          // Overdue items first
          if (isOverdueA && !isOverdueB) return -1;
          if (!isOverdueA && isOverdueB) return 1;
          
          // Then sort by due date
          return dueDateA.getTime() - dueDateB.getTime();
        } else if (a.dueDate) {
          return -1;
        } else if (b.dueDate) {
          return 1;
        }
        
        // Sort by priority if no due date
        const priorityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
        <Info className="h-10 w-10 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Error loading work items</h2>
        <p className="text-muted-foreground max-w-md">
          Failed to load your assigned tasks. Please try again later.
        </p>
      </div>
    );
  }
  
  const activeItems = filterWorkItems(workItems, "active", searchTerm);
  const completedItems = filterWorkItems(workItems, "completed", searchTerm);
  
  return (
    <div className="container py-6 max-w-screen-xl">
      <div className="flex flex-col mb-6">
        {/* Mobile-only back button above title */}
        <div className="md:hidden mb-2">
          <Button variant="ghost" size="sm" className="px-0">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold">Work Items</h1>
            <p className="text-muted-foreground">Work that has been assigned to you</p>
          </div>
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardContent className="p-0 md:p-6">
          <div className="flex items-center justify-between p-4 md:p-0 md:pb-4">
            <h2 className="text-lg font-semibold flex items-center">
              Work Items 
              <Badge variant="outline" className="ml-2 bg-blue-50">
                {activeItems.length + completedItems.length} items
              </Badge>
            </h2>
            <Button variant="ghost" size="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </Button>
          </div>
          
          <Tabs defaultValue="active" className="w-full">
            <div className="px-4 md:px-0">
              <TabsList className="mb-4 w-full md:w-auto">
                <TabsTrigger value="active" className="flex-1 md:flex-initial">Active</TabsTrigger>
                <TabsTrigger value="completed" className="flex-1 md:flex-initial">Completed</TabsTrigger>
              </TabsList>
            </div>
            
            {/* Desktop View */}
            <div className="hidden md:block">
              <TabsContent value="active" className="space-y-4">
                {/* Today's Tasks Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Showing work items with upcoming due dates (sorted by closest due date)
                    </span>
                  </div>
                </div>
                
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
                                <div className="flex space-x-2">
                                  {item.status === WorkItemStatus.PENDING && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleStartWorkItem(item)}
                                      disabled={updateWorkItemStatusMutation.isPending}
                                    >
                                      Start Work
                                    </Button>
                                  )}
                                  
                                  {/* Direct Process Form Link - for all work items regardless of status */}
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleWorkItemClick(item)}
                                  >
                                    Open Task
                                  </Button>
                                </div>
                                
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
                                <div className="cursor-pointer hover:text-primary"
                                     onClick={() => handleWorkItemClick(item)}>
                                  {item.title}
                                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">View Summary</Badge>
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
            </div>
            
            {/* Mobile View */}
            <div className="block md:hidden">
              <TabsContent value="active" className="space-y-0">
                {/* Today's Tasks Info Banner - Mobile */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mx-4 mb-4">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Showing work items with upcoming due dates (sorted by closest due date)
                    </span>
                  </div>
                </div>
                
                {activeItems.length > 0 ? (
                  <div>
                    <div className="border-t">
                      <div className="flex items-center p-4 border-b text-sm font-medium text-muted-foreground">
                        <div className="w-12">
                          <input type="checkbox" className="rounded" />
                        </div>
                        <div className="flex-1">Task</div>
                        <div className="flex items-center space-x-2">
                          <span>Due date</span>
                          <HelpCircle className="h-4 w-4" />
                        </div>
                        <div className="w-16 text-right">Priority</div>
                      </div>
                      
                      {activeItems.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex flex-col p-4 border-b hover:bg-gray-50"
                        >
                          <div className="flex items-center mb-2">
                            <div className="w-12">
                              <input type="checkbox" className="rounded" />
                            </div>
                            <div className="flex-1 font-medium">
                              {item.title}
                            </div>
                            <div>
                              {item.dueDate ? (
                                dayjs(item.dueDate).format('DD/MM/YYYY')
                              ) : (
                                "—"
                              )}
                            </div>
                            <div className="w-16 text-right">
                              <span className={`text-xs font-semibold ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-end mt-2 space-x-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleWorkItemClick(item)}
                              className="flex items-center"
                            >
                              <ClipboardList className="mr-1 h-4 w-4" />
                              Process Task
                            </Button>
                            {item.status === WorkItemStatus.PENDING && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartWorkItem(item)}
                              >
                                Start Work
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between p-4 text-sm">
                      <Button variant="ghost" size="sm" disabled>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div>
                        Page 1 of {Math.ceil(activeItems.length / 10)}
                      </div>
                      <Button variant="ghost" size="sm" disabled={activeItems.length <= 10}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
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
              
              <TabsContent value="completed" className="space-y-0">
                {completedItems.length > 0 ? (
                  <div>
                    <div className="border-t">
                      <div className="flex items-center p-4 border-b text-sm font-medium text-muted-foreground">
                        <div className="w-12">
                          <input type="checkbox" className="rounded" />
                        </div>
                        <div className="flex-1">Task</div>
                        <div>Completed</div>
                      </div>
                      
                      {completedItems.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex flex-col p-4 border-b hover:bg-gray-50"
                        >
                          <div className="flex items-center mb-2">
                            <div className="w-12">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1 font-medium">
                              {item.title}
                            </div>
                            <div>
                              {item.completedAt ? (
                                dayjs(item.completedAt).format('DD/MM/YYYY')
                              ) : (
                                "—"
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-2 ml-12">
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {item.description}
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/work-item-summary/${item.id}`)}
                              className="flex items-center bg-green-50 text-green-700 hover:bg-green-100"
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              View Summary
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between p-4 text-sm">
                      <Button variant="ghost" size="sm" disabled>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div>
                        Page 1 of {Math.ceil(completedItems.length / 10)}
                      </div>
                      <Button variant="ghost" size="sm" disabled={completedItems.length <= 10}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
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
            </div>
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