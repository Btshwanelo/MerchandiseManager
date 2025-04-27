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

// Sample data - in a real app, this would come from API
const data = [
  { name: "Jan", "Store A": 65, "Store B": 78, "Store C": 42, avg: 62 },
  { name: "Feb", "Store A": 59, "Store B": 73, "Store C": 45, avg: 59 },
  { name: "Mar", "Store A": 80, "Store B": 67, "Store C": 52, avg: 66 },
  { name: "Apr", "Store A": 81, "Store B": 90, "Store C": 59, avg: 77 },
  { name: "May", "Store A": 56, "Store B": 86, "Store C": 63, avg: 68 },
  { name: "Jun", "Store A": 55, "Store B": 79, "Store C": 70, avg: 68 },
  { name: "Jul", "Store A": 60, "Store B": 83, "Store C": 72, avg: 72 },
];

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

  const chartColors = {
    "Store A": "#1976d2",
    "Store B": "#f57c00",
    "Store C": "#4caf50",
    avg: "#9e9e9e",
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle>Inventory Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
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
              <Line
                type="monotone"
                dataKey="Store A"
                stroke={chartColors["Store A"]}
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="Store B"
                stroke={chartColors["Store B"]}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="Store C"
                stroke={chartColors["Store C"]}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="avg"
                stroke={chartColors.avg}
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Metric label="Average Stock Level" value="74.3%" />
          <Metric label="Stock Turnover Rate" value="3.8x" />
        </div>
      </CardContent>
    </Card>
  );
};
