import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Download } from "lucide-react";
import { useTheme } from "next-themes";

// Sample data - in a real app, this would come from API
const inventoryByCategory = [
  { name: "Dairy", value: 400 },
  { name: "Produce", value: 300 },
  { name: "Bakery", value: 200 },
  { name: "Beverages", value: 278 },
  { name: "Snacks", value: 189 },
];

const monthlySales = [
  { name: "Jan", sales: 4000 },
  { name: "Feb", sales: 3000 },
  { name: "Mar", sales: 2000 },
  { name: "Apr", sales: 2780 },
  { name: "May", sales: 1890 },
  { name: "Jun", sales: 2390 },
  { name: "Jul", sales: 3490 },
];

const stockTurnover = [
  { name: "Store 1", turnover: 3.2 },
  { name: "Store 2", turnover: 2.8 },
  { name: "Store 3", turnover: 4.1 },
  { name: "Store 4", turnover: 2.4 },
  { name: "Store 5", turnover: 3.7 },
];

const lowStockTrend = [
  { name: "Week 1", count: 12 },
  { name: "Week 2", count: 19 },
  { name: "Week 3", count: 15 },
  { name: "Week 4", count: 28 },
  { name: "Week 5", count: 22 },
  { name: "Week 6", count: 16 },
];

const COLORS = ['#1976d2', '#f57c00', '#4caf50', '#9c27b0', '#ff5722'];

const ReportsPage = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const handleExport = () => {
    // In a real application, this would trigger a download of the report
    alert("Report export functionality would be implemented here");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory Reports</h1>
        
        <div className="flex gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Reports
          </Button>
        </div>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList className="mb-6">
          <TabsTrigger value="inventory">Inventory Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Store Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {inventoryByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: isDark ? "#333" : "#fff",
                          border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-sm text-muted-foreground mt-4">
                  Distribution of inventory across product categories
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low Stock Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={lowStockTrend}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
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
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#f44336" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-sm text-muted-foreground mt-4">
                  Weekly count of products falling below minimum stock levels
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Sales Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlySales}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
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
                      }}
                    />
                    <Legend />
                    <Bar dataKey="sales" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-sm text-muted-foreground mt-4">
                Monthly sales figures across all stores
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Store Inventory Turnover</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stockTurnover}
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                    <XAxis type="number" stroke={isDark ? "#888" : "#666"} />
                    <YAxis dataKey="name" type="category" stroke={isDark ? "#888" : "#666"} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#333" : "#fff",
                        border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="turnover" fill="#4caf50" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-sm text-muted-foreground mt-4">
                Inventory turnover rate by store (higher is better)
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
