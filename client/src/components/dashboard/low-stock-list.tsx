import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface StockItemProps {
  id: number;
  name: string;
  location: string;
  level: number;
  maxLevel: number;
  severity: "critical" | "low" | "normal";
  onRestock: (id: number) => void;
}

const StockItem = ({ id, name, location, level, maxLevel, severity, onRestock }: StockItemProps) => {
  const percentage = Math.round((level / maxLevel) * 100);
  
  const getBgColor = () => {
    switch (severity) {
      case "critical":
        return "bg-destructive bg-opacity-5 border-destructive border-opacity-20";
      case "low":
        return "bg-warning bg-opacity-5 border-warning border-opacity-20";
      default:
        return "bg-muted";
    }
  };
  
  const getBadgeColor = () => {
    switch (severity) {
      case "critical":
        return "bg-destructive text-destructive-foreground";
      case "low":
        return "bg-warning text-background";
      default:
        return "bg-muted text-muted-foreground";
    }
  };
  
  const getProgressColor = () => {
    switch (severity) {
      case "critical":
        return "bg-destructive";
      case "low":
        return "bg-warning";
      default:
        return "bg-primary";
    }
  };
  
  return (
    <div className={`p-3 rounded border ${getBgColor()}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{location}</p>
        </div>
        <Badge className={getBadgeColor()}>
          {severity === "critical" ? "Critical" : severity === "low" ? "Low" : "Normal"}
        </Badge>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="w-full max-w-[120px]">
          <Progress value={percentage} className="h-2" indicatorClassName={getProgressColor()} />
          <p className="text-xs text-muted-foreground mt-1">
            {level} units left ({percentage}%)
          </p>
        </div>
        <Button 
          variant="link" 
          className="text-primary"
          onClick={() => onRestock(id)}
        >
          Restock
        </Button>
      </div>
    </div>
  );
};

export const LowStockList = () => {
  const { data, isLoading, error } = useQuery<(Alert & { product: any, store: any })[]>({
    queryKey: ["/api/lowstock"],
  });
  
  const handleRestock = (id: number) => {
    console.log(`Restocking item ${id}`);
    // In a real app, this would trigger a modal with a form to restock
  };
  
  const renderContent = () => {
    if (isLoading) {
      return Array(3).fill(0).map((_, index) => (
        <div key={index} className="p-3 border rounded">
          <div className="flex items-start justify-between">
            <div>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="w-full max-w-[120px]">
              <Skeleton className="h-2 w-full mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ));
    }
    
    if (error) {
      return (
        <div className="p-4 text-destructive">
          Failed to load low stock items: {error.message}
        </div>
      );
    }
    
    if (!data || data.length === 0) {
      return (
        <div className="p-4 text-center text-muted-foreground">
          No low stock items found.
        </div>
      );
    }
    
    // Sample data for now - in a real app, we'd map through the API data
    const items = [
      {
        id: 1,
        name: "Premium Coffee Beans",
        location: "Store #23 - Main Shelf",
        level: 3,
        maxLevel: 25,
        severity: "critical" as const
      },
      {
        id: 2,
        name: "Organic Honey 12oz",
        location: "Store #08 - End Cap",
        level: 14,
        maxLevel: 50,
        severity: "low" as const
      },
      {
        id: 3,
        name: "Whole Grain Bread",
        location: "Store #12 - Bakery Section",
        level: 8,
        maxLevel: 25,
        severity: "low" as const
      }
    ];
    
    return items.map(item => (
      <StockItem key={item.id} {...item} onRestock={handleRestock} />
    ));
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Low Stock Alerts</CardTitle>
          <Button variant="link" className="text-primary text-sm">View All</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {renderContent()}
        </div>
      </CardContent>
    </Card>
  );
};
