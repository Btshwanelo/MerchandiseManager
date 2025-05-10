import { useQuery } from "@tanstack/react-query";
import { 
  PlusCircle,
  MinusCircle, 
  ArrowLeftRight, 
  PackageSearch, 
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Activity as ActivityIcon,
  FilterIcon,
  CalendarCheck,
  ShoppingCart,
  CalendarClock
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ActivityData = {
  id: number;
  actionType: string;
  productId: number;
  storeId: number;
  userId: number;
  shelfId?: number;
  quantity?: number;
  fromShelfId?: number;
  toShelfId?: number;
  notes?: string;
  status?: string;
  timestamp: string;
  product: any;
  user: any;
  store: any;
};

type PaginationData = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ApiResponse = {
  data: ActivityData[];
  pagination: PaginationData;
};

const AllActivitiesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Only admins should be able to access this page
  if (user?.role !== UserRole.ADMIN) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10">
            <ActivityIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ["/api/activities/all", page, limit],
    queryFn: () => 
      fetch(`/api/activities/all?page=${page}&limit=${limit}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch activities');
          return res.json();
        }),
  });
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  const handleLimitChange = (newLimit: string) => {
    setLimit(parseInt(newLimit));
    setPage(1); // Reset to first page when changing limit
  };
  
  const getActionIcon = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case "add":
        return <PlusCircle className="h-4 w-4 text-success mr-2" />;
      case "remove":
        return <MinusCircle className="h-4 w-4 text-destructive mr-2" />;
      case "transfer":
        return <ArrowLeftRight className="h-4 w-4 text-info mr-2" />;
      case "adjust":
        return <PackageSearch className="h-4 w-4 text-warning mr-2" />;
      case "new_product":
        return <ShoppingBag className="h-4 w-4 text-primary mr-2" />;
      case "stock_take":
        return <CalendarCheck className="h-4 w-4 text-primary mr-2" />;
      case "stock_move":
        return <ShoppingCart className="h-4 w-4 text-orange-500 mr-2" />;
      case "work_item":
        return <CalendarClock className="h-4 w-4 text-blue-500 mr-2" />;
      default:
        return <ActivityIcon className="h-4 w-4 text-muted-foreground mr-2" />;
    }
  };
  
  const getActionLabel = (actionType: string) => {
    // Handle different formats: STOCK_TAKE, stock_take, Stock Take
    const formatted = actionType
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return formatted;
  };
  
  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    let variant = "secondary";
    
    switch (status.toLowerCase()) {
      case "completed":
      case "approved":
      case "delivered":
        variant = "success";
        break;
      case "pending":
      case "inprogress":
      case "in_progress":
      case "in progress":
        variant = "warning";
        break;
      case "cancelled":
      case "rejected":
        variant = "destructive";
        break;
      default:
        variant = "secondary";
    }
    
    return (
      <Badge variant={variant as any}>
        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
      </Badge>
    );
  };
  
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "MMM d, yyyy HH:mm");
    } catch (e) {
      return timestamp;
    }
  };
  
  const getLocation = (activity: ActivityData) => {
    if (activity.fromShelfId && activity.toShelfId) {
      return `${activity.store.name} (Transfer)`;
    }
    
    return activity.store.name;
  };
  
  const renderPagination = () => {
    if (!data?.pagination) return null;
    
    const { total, page: currentPage, limit: currentLimit, totalPages } = data.pagination;
    
    return (
      <div className="flex items-center justify-between border-t p-4">
        <div className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * currentLimit + 1} to {Math.min(currentPage * currentLimit, total)} of {total} activities
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              value={currentLimit.toString()}
              onValueChange={handleLimitChange}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={currentLimit.toString()} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 20, 50].map((value) => (
                  <SelectItem key={value} value={value.toString()}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Page</span>
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Page</span>
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>All System Activities</div>
              <Skeleton className="h-10 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center">
                          <Skeleton className="h-4 w-4 mr-2" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border-t p-4">
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10">
            <ActivityIcon className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">
              Failed to load activities: {error instanceof Error ? error.message : "Unknown error"}
            </p>
            <Button 
              onClick={() => window.location.reload()}
              variant="default"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>All System Activities</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline">
                    <FilterIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter Activities (Coming Soon)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data && data.data.length > 0 ? (
                  data.data.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="flex items-center">
                          {getActionIcon(activity.actionType)}
                          <span>{getActionLabel(activity.actionType)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {activity.product ? activity.product.name : "N/A"}
                      </TableCell>
                      <TableCell>{getLocation(activity)}</TableCell>
                      <TableCell>{activity.user.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTimestamp(activity.timestamp)}
                      </TableCell>
                      <TableCell>{getStatusBadge(activity.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <ActivityIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No activities found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {renderPagination()}
        </CardContent>
      </Card>
    </div>
  );
};

export default AllActivitiesPage;