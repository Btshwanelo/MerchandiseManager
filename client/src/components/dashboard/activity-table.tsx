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
import { Activity } from "@shared/schema";
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

  const formatTimestamp = (timestamp: Date) => {
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

export const ActivityTable = () => {
  const { data, isLoading, error } = useQuery<
    (Activity & { product: any; user: any; store: any })[]
  >({
    queryKey: ["/api/activities/recent"],
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

    if (!data || data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
            No recent activities found.
          </TableCell>
        </TableRow>
      );
    }

    // Sample data for now - in a real app we'd map through the API data
    // Using sample data until API is connected
    const sampleData = [
      {
        id: 1,
        actionType: "add",
        productId: 1,
        shelfId: 1,
        storeId: 1,
        userId: 1,
        quantity: 10,
        status: "completed",
        timestamp: new Date(new Date().setHours(new Date().getHours() - 1)),
        product: { id: 1, name: "Organic Apples 5lb Bag" },
        user: { id: 1, name: "Sarah Johnson" },
        store: { id: 8, name: "Store #08 - Produce Section" }
      },
      {
        id: 2,
        actionType: "remove",
        productId: 2,
        shelfId: 2,
        storeId: 2,
        userId: 2,
        quantity: 5,
        status: "completed",
        timestamp: new Date(new Date().setHours(new Date().getHours() - 3)),
        product: { id: 2, name: "Premium Coffee Beans" },
        user: { id: 2, name: "Miguel Rodriguez" },
        store: { id: 23, name: "Store #23 - Main Shelf" }
      },
      {
        id: 3,
        actionType: "transfer",
        productId: 3,
        shelfId: 3,
        storeId: 3,
        userId: 3,
        fromShelfId: 12,
        toShelfId: 15,
        quantity: 8,
        status: "in_progress",
        timestamp: new Date(new Date().setDate(new Date().getDate() - 1)),
        product: { id: 3, name: "Whole Grain Bread" },
        user: { id: 3, name: "David Chen" },
        store: { id: 12, name: "Store #12" }
      },
      {
        id: 4,
        actionType: "adjust",
        productId: 4,
        shelfId: 4,
        storeId: 4,
        userId: 4,
        quantity: 2,
        status: "completed",
        timestamp: new Date(new Date().setDate(new Date().getDate() - 1)),
        product: { id: 4, name: "Almond Milk 32oz" },
        user: { id: 4, name: "Emily Taylor" },
        store: { id: 5, name: "Store #05 - Dairy Section" }
      },
      {
        id: 5,
        actionType: "new_product",
        productId: 5,
        storeId: 5,
        userId: 5,
        status: "completed",
        timestamp: new Date(new Date().setDate(new Date().getDate() - 3)),
        product: { id: 5, name: "Organic Honey 12oz" },
        user: { id: 5, name: "John Smith" },
        store: { id: 8, name: "Store #08 - End Cap" }
      }
    ];

    return sampleData.map((activity) => (
      <ActivityItem key={activity.id} activity={activity as any} />
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
        <p className="text-sm text-muted-foreground">Showing 5 of 132 activities</p>

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
          <span className="text-muted-foreground">...</span>
          <Button variant="outline" size="sm">
            27
          </Button>

          <Button variant="outline" size="icon">
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
      </div>
    </Card>
  );
};
