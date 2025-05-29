import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface MetricProps {
  label: string;
  value: string | number;
}

const Metric = ({ label, value }: MetricProps) => (
  <div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-lg font-medium text-foreground font-mono">{value}</p>
  </div>
);

export const InventoryChart = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { data: trendsData, isLoading, error } = useQuery<{
    chartData: Array<{ name: string; [key: string]: any }>;
    stores: string[];
  }>({
    queryKey: ["/api/dashboard/inventory-trends"],
  });

  // Generate colors for stores dynamically
  const getStoreColor = (index: number) => {
    const colors = ["#1976d2", "#f57c00", "#4caf50", "#9c27b0", "#e91e63", "#00bcd4"];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle>Inventory Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !trendsData) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle>Inventory Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full flex items-center justify-center text-muted-foreground">
            No inventory trend data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const { chartData, stores } = trendsData;

  // Calculate metrics from real data
  const totalStock = chartData.reduce((sum: number, month: any) => {
    return sum + stores.reduce((monthSum: number, store: string) => monthSum + (month[store] || 0), 0);
  }, 0);
  
  const avgStockLevel = chartData.length > 0 && stores.length > 0 
    ? Math.round((totalStock / (chartData.length * stores.length)))
    : 0;

  const stockTurnover = stores.length > 0 ? (totalStock / stores.length / 100).toFixed(1) : "0.0";

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle>Inventory Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
              <XAxis dataKey="name" stroke={isDark ? "#888" : "#666"} />
              <YAxis stroke={isDark ? "#888" : "#666"} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "#333" : "#fff",
                  border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                  color: isDark ? "#eee" : "#333",
                }}
              />
              <Legend />
              {stores.map((store, index) => (
                <Line
                  key={store}
                  type="monotone"
                  dataKey={store}
                  stroke={getStoreColor(index)}
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              ))}
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#9e9e9e"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Metric label="Average Stock Level" value={`${avgStockLevel} units`} />
          <Metric label="Stock Turnover Rate" value={`${stockTurnover}x`} />
        </div>
      </CardContent>
    </Card>
  );
};
