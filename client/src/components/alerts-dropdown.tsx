import { useState, useEffect } from "react";
import { Bell, BellOff, X, Check } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAlerts, AlertType } from "@/hooks/use-alerts";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function AlertsDropdown() {
  const { alerts, unreadAlerts, markAsRead, deleteAlert, refetchAlerts } = useAlerts();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  // Auto refresh alerts every minute
  useEffect(() => {
    const interval = setInterval(() => {
      refetchAlerts();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [refetchAlerts]);

  // Force a refresh when the dropdown is opened
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      refetchAlerts();
    }
    setOpen(newOpen);
  };

  // Mark all alerts as read
  const handleMarkAllAsRead = () => {
    unreadAlerts.forEach(alert => {
      markAsRead(alert.id);
    });
    
    toast({
      title: "Notifications",
      description: "All notifications marked as read",
    });
  };

  // Handle mark as read for a single alert
  const handleMarkAsRead = (e: React.MouseEvent, alertId: number) => {
    e.stopPropagation();
    markAsRead(alertId);
  };

  // Handle delete for a single alert
  const handleDelete = (e: React.MouseEvent, alertId: number) => {
    e.stopPropagation();
    deleteAlert(alertId);
  };

  // Get alert icon based on type
  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case AlertType.WORK_ITEM_COMPLETED:
        return <Check className="h-4 w-4 text-green-500" />;
      case AlertType.STORE_ASSIGNED:
        return <Check className="h-4 w-4 text-blue-500" />;
      case AlertType.WORK_ITEM_ASSIGNED:
        return <Check className="h-4 w-4 text-violet-500" />;
      case AlertType.DUE_DATE_APPROACHING:
        return <Check className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  // Format alert date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadAlerts.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadAlerts.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2 border-b">
          <div className="font-semibold">Notifications</div>
          <div className="flex items-center gap-2">
            {unreadAlerts.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMarkAllAsRead}
                className="h-8 text-xs"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
              <BellOff className="h-10 w-10 mb-2 text-muted-foreground/50" />
              <p>No notifications</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <Card 
                key={alert.id} 
                className={cn(
                  "m-2 p-3 text-sm flex flex-col space-y-1 cursor-pointer hover:bg-accent transition-colors",
                  alert.status === "unread" && "bg-accent/20 border-l-4 border-l-primary"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {getAlertIcon(alert.type as AlertType)}
                    </div>
                    <div>
                      <div>{alert.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(alert.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {alert.status === "unread" && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={(e) => handleMarkAsRead(e, alert.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" 
                      onClick={(e) => handleDelete(e, alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}