import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  iconColor?: string;
  valueColor?: string;
}

export const MetricCard = ({
  title,
  value,
  icon: Icon,
  trend,
  iconColor = "text-primary",
  valueColor = "text-foreground"
}: MetricCardProps) => {
  const getTrendColor = () => {
    if (!trend) return "";
    switch (trend.direction) {
      case "up":
        return "text-success";
      case "down":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      default:
        return "−";
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{title}</p>
            <h4 className={cn("text-2xl font-medium mt-1 font-mono", valueColor)}>
              {value}
            </h4>
            {trend && (
              <p className={cn("text-sm mt-2 flex items-center", getTrendColor())}>
                <span className="mr-1">{getTrendIcon()}</span>
                {trend.value}
              </p>
            )}
          </div>
          <div className={cn("p-2 rounded-lg bg-opacity-10", iconColor, `bg-${iconColor.split('-')[1]}`)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
