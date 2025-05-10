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
import { CalendarIcon, Download, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ['#7ccd57', '#1976d2', '#f57c00', '#9c27b0', '#ff5722'];

const ReportsPage = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [timeframe, setTimeframe] = useState<string>("month");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // Fetch stock take report data
  const { data: stockTakeData, isLoading: isLoadingStockTake } = useQuery({
    queryKey: ["/api/reports/stocktakes", timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/reports/stocktakes?timeframe=${timeframe}`);
      if (!res.ok) throw new Error("Failed to fetch stock take reports");
      return res.json();
    },
  });
  
  // Fetch order report data
  const { data: orderData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["/api/reports/orders", timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/reports/orders?timeframe=${timeframe}`);
      if (!res.ok) throw new Error("Failed to fetch order reports");
      return res.json();
    },
  });
  
  // Fetch competitor report data
  const { data: competitorData, isLoading: isLoadingCompetitors } = useQuery({
    queryKey: ["/api/reports/competitors", timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/reports/competitors?timeframe=${timeframe}`);
      if (!res.ok) throw new Error("Failed to fetch competitor reports");
      return res.json();
    },
  });
  
  // Fetch activity report data
  const { data: activityData, isLoading: isLoadingActivities } = useQuery({
    queryKey: ["/api/reports/activities", timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/reports/activities?timeframe=${timeframe}`);
      if (!res.ok) throw new Error("Failed to fetch activity reports");
      return res.json();
    },
  });
  
  const isLoading = isLoadingStockTake || isLoadingOrders || isLoadingCompetitors || isLoadingActivities;
  
  // Transform stock take data for charts
  const stockTakeByStore = stockTakeData?.byStore || [];
  const stockTakeTimeline = stockTakeData?.timeline || [];
  
  // Transform order data for charts
  const ordersByStatus = orderData?.summary ? [
    { name: "Completed", value: orderData.summary.completed },
    { name: "Pending", value: orderData.summary.pending },
    { name: "Processing", value: orderData.summary.processing },
    { name: "Shipped", value: orderData.summary.shipped },
    { name: "Canceled", value: orderData.summary.canceled },
  ].filter(item => item.value > 0) : [];
  
  const topOrderedProducts = orderData?.topProducts || [];
  
  // Transform competitor data for charts
  const competitorsByStore = competitorData?.byStore || [];
  const competitorsByBrand = competitorData?.byBrand || [];
  
  // Transform activity data for charts
  const activitiesByType = activityData?.byType || [];
  const activityTimeline = activityData?.timeline || [];
  
  const handleExport = () => {
    // In a real application, this would trigger a download of the report data
    const reportData = {
      stockTake: stockTakeData,
      orders: orderData,
      competitors: competitorData,
      activities: activityData,
      exportDate: new Date().toISOString(),
      timeframe: timeframe
    };
    
    // Create a JSON blob and download it
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${timeframe}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Inventory Reports</h1>
        
        <div className="flex flex-wrap gap-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
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
      
      {isLoading ? (
        <div className="flex justify-center items-center h-80">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-4 text-lg">Loading report data...</span>
        </div>
      ) : (
        <Tabs defaultValue="stockTake">
          <TabsList className="mb-6">
            <TabsTrigger value="stockTake">Stock Take</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="competitors">Competitor Analysis</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="stockTake">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stock Take Status Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Stock Take Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stockTakeData?.summary ? [
                            { name: "Completed", value: stockTakeData.summary.completed || 0 },
                            { name: "Pending", value: stockTakeData.summary.pending || 0 },
                            { name: "Canceled", value: stockTakeData.summary.canceled || 0 },
                          ].filter(item => item.value > 0) : []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: "Completed", color: COLORS[0] },
                            { name: "Pending", color: COLORS[1] },
                            { name: "Canceled", color: COLORS[2] },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
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
                    Stock take status distribution for the {timeframe}
                  </div>
                </CardContent>
              </Card>

              {/* Stock Take Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Stock Take Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={stockTakeTimeline}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                        <XAxis dataKey="date" stroke={isDark ? "#888" : "#666"} />
                        <YAxis stroke={isDark ? "#888" : "#666"} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#333" : "#fff",
                            border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke={COLORS[0]} strokeWidth={2} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-sm text-muted-foreground mt-4">
                    Daily stock take completion trend
                  </div>
                </CardContent>
              </Card>

              {/* Stock Take by Store */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Stock Take by Store</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stockTakeByStore}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 30,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                        <XAxis dataKey="name" stroke={isDark ? "#888" : "#666"} angle={-45} textAnchor="end" />
                        <YAxis stroke={isDark ? "#888" : "#666"} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#333" : "#fff",
                            border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                          }}
                        />
                        <Legend />
                        <Bar dataKey="completed" name="Completed" fill={COLORS[0]} />
                        <Bar dataKey="pending" name="Pending" fill={COLORS[1]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-sm text-muted-foreground mt-4">
                    Stock take status by store location
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Status Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ordersByStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {ordersByStatus.map((entry, index) => (
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
                    Order status distribution for the {timeframe}
                  </div>
                </CardContent>
              </Card>

              {/* Top Ordered Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Ordered Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topOrderedProducts}
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
                        <Bar dataKey="count" name="Order Count" fill={COLORS[1]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-sm text-muted-foreground mt-4">
                    Products with the most order requests
                  </div>
                </CardContent>
              </Card>

              {/* Order Timeline */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Order Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={orderData?.timeline || []}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                        <XAxis dataKey="date" stroke={isDark ? "#888" : "#666"} />
                        <YAxis stroke={isDark ? "#888" : "#666"} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#333" : "#fff",
                            border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="count" name="Orders" stroke={COLORS[1]} strokeWidth={2} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-sm text-muted-foreground mt-4">
                    Daily order placement trend
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="competitors">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Competitor Analysis by Store */}
              <Card>
                <CardHeader>
                  <CardTitle>Competitor Analysis by Store</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={competitorsByStore}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 30,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                        <XAxis dataKey="name" stroke={isDark ? "#888" : "#666"} angle={-45} textAnchor="end" />
                        <YAxis stroke={isDark ? "#888" : "#666"} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#333" : "#fff",
                            border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                          }}
                        />
                        <Legend />
                        <Bar dataKey="count" name="Entries" fill={COLORS[2]} />
                        <Bar dataKey="promoCount" name="With Promotions" fill={COLORS[3]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-sm text-muted-foreground mt-4">
                    Competitor data collected by store
                  </div>
                </CardContent>
              </Card>

              {/* Competitor Analysis by Brand */}
              <Card>
                <CardHeader>
                  <CardTitle>Competitor Analysis by Brand</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={competitorsByBrand}
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
                        <Bar dataKey="count" name="Entries" fill={COLORS[2]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-sm text-muted-foreground mt-4">
                    Competitor data by brand
                  </div>
                </CardContent>
              </Card>

              {/* Promotion Types */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Promotion Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={competitorData?.promoTypes || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={130}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {(competitorData?.promoTypes || []).map((entry, index) => (
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
                    Types of promotions used by competitors
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activities">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Activities by Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Activities by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activitiesByType}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {activitiesByType.map((entry, index) => (
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
                    Distribution of activities by type
                  </div>
                </CardContent>
              </Card>

              {/* Activities by User */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Users by Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={activityData?.byUser || []}
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
                        <Bar dataKey="count" name="Activities" fill={COLORS[4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-sm text-muted-foreground mt-4">
                    Users with the most activities
                  </div>
                </CardContent>
              </Card>

              {/* Activity Timeline */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={activityTimeline}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                        <XAxis dataKey="date" stroke={isDark ? "#888" : "#666"} />
                        <YAxis stroke={isDark ? "#888" : "#666"} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#333" : "#fff",
                            border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="count" name="Activities" stroke={COLORS[4]} strokeWidth={2} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-sm text-muted-foreground mt-4">
                    Daily activity trend
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ReportsPage;
