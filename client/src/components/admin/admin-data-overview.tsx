import React from "react";
import {
  ClipboardList,
  Tag,
  BarChart,
  ShoppingCart,
  ImageIcon,
} from "lucide-react";

// Utility function to convert server file paths to client URLs
const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return "";

  try {
    // If it's a file ID (numeric), use the new file endpoint
    if (!isNaN(parseInt(imagePath))) {
      return `/api/files/${imagePath}`;
    }

    // Check if it's a server-side file path
    // Handle any format of server-side path that includes the uploads directory
    if (
      imagePath.includes("/uploads/") ||
      imagePath.includes("/home/runner/workspace/")
    ) {
      // Extract just the filename with extension
      const parts = imagePath.split("/");
      const filename = parts[parts.length - 1];
      if (!filename) return "";

      // Return an API endpoint URL for the image
      return `/api/images/${encodeURIComponent(filename)}`;
    }

    // If it's a timestamped filename without path
    if (/^\d+[-_].+\.(jpg|jpeg|png|gif)$/i.test(imagePath)) {
      return `/api/images/${encodeURIComponent(imagePath)}`;
    }

    // If it's already a URL or other format, return as is
    return imagePath;
  } catch (error) {
    console.error(
      "Error processing image path:",
      error,
      "Path was:",
      imagePath
    );
    return "";
  }
};

// Helper function to handle image loading errors
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.target as HTMLImageElement;
  // When image fails to load, show the icon instead
  target.style.display = "none";
  const parent = target.parentElement;
  if (parent) {
    const icon = parent.querySelector(".fallback-icon");
    if (icon) {
      (icon as HTMLElement).style.display = "block";
    }

    // Add a message indicating the image couldn't be loaded
    // First check if a message already exists
    if (!parent.querySelector(".error-message")) {
      const messageElem = document.createElement("div");
      messageElem.className =
        "text-xs text-white text-center px-2 absolute bottom-8 w-full bg-black/50 error-message";
      messageElem.innerText = "Image unavailable";
      parent.appendChild(messageElem);
    }
  }
};

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type AdminDataOverviewProps = {
  stockTake: any;
  merchandisingData: any;
  competitorData: any;
  orderData: any;
  auditTrail: any[];
};

export function AdminDataOverview({
  stockTake,
  merchandisingData,
  competitorData,
  orderData,
  auditTrail,
}: AdminDataOverviewProps) {
  return (
    <div className="mt-8 border-t pt-8">
      <h2 className="text-2xl font-bold mb-6 text-primary">
        Admin Data Overview
      </h2>

      <div className="space-y-6">
        {/* Tabs for different data types */}
        <Tabs defaultValue="stock-take" className="w-full">
          <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 lg:flex">
            <TabsTrigger value="stock-take" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span>Stock Take</span>
            </TabsTrigger>
            <TabsTrigger
              value="merchandising"
              className="flex items-center gap-2"
            >
              <Tag className="h-4 w-4" />
              <span>Merchandising</span>
            </TabsTrigger>
            <TabsTrigger value="competitor" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              <span>Competitor Data</span>
            </TabsTrigger>
            <TabsTrigger value="order" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Order Data</span>
            </TabsTrigger>
          </TabsList>

          {/* Stock Take Data Tab */}
          <TabsContent value="stock-take" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2 text-primary" />
                  Stock Take Details
                </CardTitle>
                <CardDescription>
                  Inventory data submitted by merchandiser
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!stockTake ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No stock take data available for this work item.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-1">
                          Submitted Date
                        </h3>
                        <p>
                          {stockTake.date
                            ? new Date(stockTake.date).toLocaleString()
                            : "Not available"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-1">Status</h3>
                        <Badge
                          variant={
                            stockTake.status === "completed"
                              ? "success"
                              : "default"
                          }
                        >
                          {stockTake.status}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        Inventory Items ({stockTake.items?.length || 0})
                      </h3>
                      <div className="border rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Product
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                SKU
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Location
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Quantity
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Min Level
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {stockTake.items?.map((item: any) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3 text-sm">
                                  {item.product?.name || "Unknown Product"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {item.product?.sku || "N/A"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <Badge
                                    variant="outline"
                                    className="capitalize"
                                  >
                                    {item.location.replace("_", " ")}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span
                                    className={
                                      item.quantity <
                                      (item.product?.minStockLevel || 0)
                                        ? "text-red-600 font-medium"
                                        : ""
                                    }
                                  >
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {item.product?.minStockLevel || "N/A"}
                                </td>
                              </tr>
                            ))}
                            {!stockTake.items?.length && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="px-4 py-6 text-center text-muted-foreground"
                                >
                                  No items recorded in this stock take
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Show shelf images if available */}
                    {stockTake.pictures && stockTake.pictures.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">
                          Shelf Images ({stockTake.pictures.length})
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {stockTake.pictures.map(
                            (image: string, index: number) => (
                              <div
                                key={index}
                                className="relative aspect-square rounded-md overflow-hidden border hover:shadow-md transition-shadow"
                                onClick={() => {
                                  const imageSrc = getImageUrl(image);
                                  if (imageSrc) {
                                    window.open(imageSrc, "_blank");
                                  }
                                }}
                              >
                                <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                                  {image ? (
                                    <img
                                      src={getImageUrl(image)}
                                      alt={`Shelf image ${index + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={handleImageError}
                                    />
                                  ) : null}
                                  <ImageIcon
                                    className="h-8 w-8 text-muted-foreground fallback-icon"
                                    style={{ display: "none" }}
                                  />
                                </div>
                                <div className="absolute inset-0 hover:bg-black/10 transition-colors flex items-center justify-center cursor-pointer">
                                  <span className="sr-only">View Image</span>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                                  Image {index + 1}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Merchandising Data Tab */}
          <TabsContent value="merchandising" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-primary" />
                  Merchandising Details
                </CardTitle>
                <CardDescription>
                  Merchandising data submitted by merchandiser
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!merchandisingData ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No merchandising data available for this work item.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-1">
                          Created Date
                        </h3>
                        <p>
                          {merchandisingData.date
                            ? new Date(merchandisingData.date).toLocaleString()
                            : "Not available"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        Promotional Items
                      </h3>
                      <div className="border rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Product
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                SKU
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Promotional Price
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Base Price
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {(
                              merchandisingData.merchandisingItems ||
                              merchandisingData.items
                            )?.map((item: any, index: number) => (
                              <tr key={index}>
                                <td className="px-4 py-3 text-sm">
                                  {item.productName ||
                                    item.product?.name ||
                                    "Unknown Product"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {item.sku || item.product?.sku || "N/A"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  R {(item.price / 100).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  R{" "}
                                  {item.basePrice
                                    ? (item.basePrice / 100).toFixed(2)
                                    : "N/A"}
                                </td>
                              </tr>
                            ))}
                            {!(
                              merchandisingData.merchandisingItems ||
                              merchandisingData.items
                            )?.length && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-6 text-center text-muted-foreground"
                                >
                                  No promotional items recorded
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {merchandisingData.comment && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">
                          Additional Notes
                        </h3>
                        <div className="border rounded-md p-4 bg-muted/30">
                          <p>{merchandisingData.comment}</p>
                        </div>
                      </div>
                    )}

                    {/* Show promotion images if available */}
                    {merchandisingData.promotionPictures &&
                      merchandisingData.promotionPictures.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium mb-2">
                            Promotion Images (
                            {merchandisingData.promotionPictures.length})
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {merchandisingData.promotionPictures.map(
                              (image: string, index: number) => (
                                <div
                                  key={index}
                                  className="relative aspect-square rounded-md overflow-hidden border hover:shadow-md transition-shadow"
                                  onClick={() => {
                                    const imageSrc = getImageUrl(image);
                                    if (imageSrc) {
                                      window.open(imageSrc, "_blank");
                                    }
                                  }}
                                >
                                  <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                                    {image ? (
                                      <img
                                        src={getImageUrl(image)}
                                        alt={`Promotion image ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={handleImageError}
                                      />
                                    ) : null}
                                    <ImageIcon
                                      className="h-8 w-8 text-muted-foreground fallback-icon"
                                      style={{ display: "none" }}
                                    />
                                  </div>
                                  <div className="absolute inset-0 hover:bg-black/10 transition-colors flex items-center justify-center cursor-pointer">
                                    <span className="sr-only">View Image</span>
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                                    Image {index + 1}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Competitor Data Tab */}
          <TabsContent value="competitor" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2 text-primary" />
                  Competitor Details
                </CardTitle>
                <CardDescription>
                  Competitor data submitted by merchandiser
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!competitorData ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No competitor data available for this work item.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-1">
                          Created Date
                        </h3>
                        <p>
                          {competitorData.createdAt
                            ? new Date(
                                competitorData.createdAt
                              ).toLocaleString()
                            : "Not available"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-1">
                          Competitor Store
                        </h3>
                        <p>{competitorData.storeName || "Not specified"}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        Competitor Products
                      </h3>
                      <div className="border rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Product
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Regular Price
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Promo Price
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Notes
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {competitorData.items?.map(
                              (item: any, index: number) => (
                                <tr key={index}>
                                  <td className="px-4 py-3 text-sm">
                                    {item.product?.name || "Unknown Product"}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    R {item.price.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {item.promotionalPrice
                                      ? `R ${item.promotionalPrice.toFixed(2)}`
                                      : "N/A"}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {item.notes || "No notes"}
                                  </td>
                                </tr>
                              )
                            )}
                            {!competitorData.items?.length && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-6 text-center text-muted-foreground"
                                >
                                  No competitor products recorded
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {competitorData.comment && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">
                          Additional Notes
                        </h3>
                        <div className="border rounded-md p-4 bg-muted/30">
                          <p>{competitorData.comment}</p>
                        </div>
                      </div>
                    )}

                    {/* Show competitor images if available */}
                    {competitorData.pictures &&
                      competitorData.pictures.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium mb-2">
                            Competitor Images ({competitorData.pictures.length})
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {competitorData.pictures.map(
                              (image: string, index: number) => (
                                <div
                                  key={index}
                                  className="relative aspect-square rounded-md overflow-hidden border hover:shadow-md transition-shadow"
                                  onClick={() => {
                                    const imageSrc = getImageUrl(image);
                                    if (imageSrc) {
                                      window.open(imageSrc, "_blank");
                                    }
                                  }}
                                >
                                  <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                                    {image ? (
                                      <img
                                        src={getImageUrl(image)}
                                        alt={`Competitor image ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={handleImageError}
                                      />
                                    ) : null}
                                    <ImageIcon
                                      className="h-8 w-8 text-muted-foreground fallback-icon"
                                      style={{ display: "none" }}
                                    />
                                  </div>
                                  <div className="absolute inset-0 hover:bg-black/10 transition-colors flex items-center justify-center cursor-pointer">
                                    <span className="sr-only">View Image</span>
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                                    Image {index + 1}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order Data Tab */}
          <TabsContent value="order" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2 text-primary" />
                  Order Details
                </CardTitle>
                <CardDescription>
                  Order data submitted by merchandiser
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!orderData ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No order data available for this work item.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-1">
                          Created Date
                        </h3>
                        <p>
                          {orderData.createdAt
                            ? new Date(orderData.createdAt).toLocaleString()
                            : "Not available"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-1">Status</h3>
                        <Badge
                          variant={
                            orderData.status === "completed"
                              ? "success"
                              : "default"
                          }
                        >
                          {orderData.status}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Order Items</h3>
                      <div className="border rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Product
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                SKU
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Quantity
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Notes
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {orderData.items?.map(
                              (item: any, index: number) => (
                                <tr key={index}>
                                  <td className="px-4 py-3 text-sm">
                                    {item.product?.name || "Unknown Product"}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {item.product?.sku || "N/A"}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {item.quantity}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {item.notes || "No notes"}
                                  </td>
                                </tr>
                              )
                            )}
                            {!orderData.items?.length && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-6 text-center text-muted-foreground"
                                >
                                  No order items recorded
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {orderData.note && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">
                          Additional Notes
                        </h3>
                        <div className="border rounded-md p-4 bg-muted/30">
                          <p>{orderData.note}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Show audit trail if available */}
      {auditTrail && auditTrail.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Audit Trail</h3>
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {auditTrail.map((entry: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {entry.user?.name || "Unknown User"}
                    </td>
                    <td className="px-4 py-3 text-sm">{entry.action}</td>
                    <td className="px-4 py-3 text-sm">
                      {entry.comments || "No comments"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
