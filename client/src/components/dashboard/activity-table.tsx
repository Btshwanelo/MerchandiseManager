import { Card } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, MinusCircle, ArrowLeftRight, PackageSearch, ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Activity, UserRole } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

interface ActivityItemProps {
  activity: Activity & { product: any; user: any; store: any };
}

const ActivityItem = ({ activity }: ActivityItemProps) => {
  const getActionIcon = () => {
    switch (activity.actionType) {
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
      default:
        return null;
    }
  };

  const getActionLabel = () => {
    switch (activity.actionType) {
      case "add":
        return "Stock Added";
      case "remove":
        return "Stock Removed";
      case "transfer":
        return "Transfer";
      case "adjust":
        return "Adjustment";
      case "new_product":
        return "New Product";
      default:
        return activity.actionType;
    }
  };

  const getStatusBadge = () => {
    switch (activity.status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-success bg-opacity-10 text-success">
            Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-info bg-opacity-10 text-info">
            In Progress
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-destructive bg-opacity-10 text-destructive">
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted bg-opacity-10 text-muted-foreground">
            {activity.status}
          </Badge>
        );
    }
  };

  const formatTimestamp = (timestamp: Date | null) => {
    if (!timestamp) return "Unknown date";
    
    const now = new Date();
    const activityDate = new Date(timestamp);
    
    // If it's today, show time
    if (
      activityDate.getDate() === now.getDate() &&
      activityDate.getMonth() === now.getMonth() &&
      activityDate.getFullYear() === now.getFullYear()
    ) {
      return `Today, ${format(activityDate, "h:mm a")}`;
    }
    
    // If it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (
      activityDate.getDate() === yesterday.getDate() &&
      activityDate.getMonth() === yesterday.getMonth() &&
      activityDate.getFullYear() === yesterday.getFullYear()
    ) {
      return `Yesterday, ${format(activityDate, "h:mm a")}`;
    }
    
    // Otherwise show date
    return format(activityDate, "MMM d, h:mm a");
  };

  // Format location depending on action type
  const getLocation = () => {
    if (activity.actionType === "transfer" && activity.fromShelfId && activity.toShelfId) {
      return `Store #${activity.store.id} → Store #${activity.toShelfId}`;
    }
    return `Store #${activity.store.id}${activity.shelfId ? ` - ${activity.product.name}` : ""}`;
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center">
          {getActionIcon()}
          <span>{getActionLabel()}</span>
        </div>
      </TableCell>
      <TableCell>{activity.product.name}</TableCell>
      <TableCell>{getLocation()}</TableCell>
      <TableCell>{activity.user.name}</TableCell>
      <TableCell className="text-muted-foreground">
        {formatTimestamp(activity.timestamp)}
      </TableCell>
      <TableCell>{getStatusBadge()}</TableCell>
    </TableRow>
  );
};

interface ActivityTableProps {
  limit?: number;
  showAllForAdmin?: boolean;
}

export const ActivityTable = ({ limit = 5, showAllForAdmin = true }: ActivityTableProps) => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  
  // Use the appropriate endpoint based on user role
  const endpoint = isAdmin && showAllForAdmin ? "/api/activities/all" : "/api/activities/recent";
  const queryParams = isAdmin && showAllForAdmin ? `?limit=${limit}` : `?limit=${limit}`;
  
  const { data, isLoading, error } = useQuery<
    (Activity & { product: any; user: any; store: any })[] | 
    { data: (Activity & { product: any; user: any; store: any })[], pagination: any }
  >({
    queryKey: [endpoint, limit],
    queryFn: async () => {
      const response = await fetch(`${endpoint}${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to load activities');
      }
      return response.json();
    }
  });

  const renderTableBody = () => {
    if (isLoading) {
      return Array(5)
        .fill(0)
        .map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-20" />
            </TableCell>
          </TableRow>
        ));
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center text-destructive py-4">
            Failed to load activities: {error.message}
          </TableCell>
        </TableRow>
      );
    }

    // Handle both response formats (array or object with pagination)
    let activities: (Activity & { product: any; user: any; store: any })[] = [];
    let totalCount = 0;
    
    if (!data) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
            No recent activities found.
          </TableCell>
        </TableRow>
      );
    }
    
    // Check if the response is paginated or a simple array
    if ('data' in data && Array.isArray(data.data)) {
      activities = data.data;
      totalCount = data.pagination?.total || activities.length;
    } else if (Array.isArray(data)) {
      activities = data;
      totalCount = activities.length;
    }
    
    if (activities.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
            No recent activities found.
          </TableCell>
        </TableRow>
      );
    }

    return activities.map((activity) => (
      <ActivityItem key={activity.id} activity={activity} />
    ));
  };

  return (
    <Card>
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
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
      </div>

      <div className="p-4 border-t flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {activities?.length || 0} of {totalCount} activities
        </p>

        {isAdmin && showAllForAdmin && (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" disabled>
              <span className="sr-only">Previous</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                ></path>
              </svg>
            </Button>

            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              3
            </Button>
            {totalCount > 15 && <span className="text-muted-foreground">...</span>}
            {totalCount > 15 && (
              <Button variant="outline" size="sm">
                {Math.ceil(totalCount / limit)}
              </Button>
            )}

            <Button 
              variant="outline" 
              size="icon"
              disabled={activities?.length < limit}
            >
              <span className="sr-only">Next</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                ></path>
              </svg>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
