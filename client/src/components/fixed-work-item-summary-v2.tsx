import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Clock,
  File,
  FileText,
  Info,
  ShoppingCart,
  Tag,
  Store as StoreIcon,
  User,
} from "lucide-react";
import { WorkItemStatus } from "@shared/schema";
import { Link } from "wouter";
import {
  getImageUrl,
  processImagePaths,
  getPlaceholderImageUrl,
} from "@/lib/image-utils";

interface WorkItemSummaryProps {
  workItem: any;
  stockTake?: any;
  merchandising?: any;
  competitorMerchandising?: any;
  order?: any;
}

const WorkItemSummary = ({
  workItem,
  stockTake,
  merchandising,
  competitorMerchandising,
  order,
}: WorkItemSummaryProps) => {
  if (!workItem) return null;

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  // Util to ensure we don't show "undefined" or "null"
  const formatValue = (value: any) => {
    if (value === undefined || value === null) return "N/A";
    return value;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link href="/my-assignments">
          <Button variant="outline" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{workItem.title}</h1>
            <p className="text-muted-foreground">{workItem.description}</p>
          </div>
          <Badge
            variant={
              workItem.status === WorkItemStatus.COMPLETED
                ? "success"
                : "secondary"
            }
          >
            {workItem.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Work Item Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Work Item Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <StoreIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Store:</span>
                <span className="text-sm">{workItem.store?.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Type:</span>
                <span className="text-sm">{workItem.type}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Due Date:</span>
                <span className="text-sm">{formatDate(workItem.dueDate)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Created:</span>
                <span className="text-sm">
                  {formatDate(workItem.createdAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Take Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Stock Take Data
            </CardTitle>
            <CardDescription>
              Inventory count and stock level information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stockTake ? (
              <>
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {stockTake.items?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Products Counted
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stockTake.items?.reduce(
                        (sum: number, item: any) => sum + (item.quantity || 0),
                        0
                      ) || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Units
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatDate(stockTake.date)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Completed
                    </div>
                  </div>
                </div>

                {/* Stock Take Items Table */}
                {stockTake.items && stockTake.items.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <h3 className="font-medium text-sm mb-2">
                      Stock Take Items
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-border">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-border px-4 py-2 text-left text-sm font-medium">
                              Product
                            </th>
                            <th className="border border-border px-4 py-2 text-left text-sm font-medium">
                              SKU
                            </th>
                            <th className="border border-border px-4 py-2 text-left text-sm font-medium">
                              Quantity
                            </th>
                            <th className="border border-border px-4 py-2 text-left text-sm font-medium">
                              Location
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {stockTake.items.map((item: any, index: number) => (
                            <tr
                              key={index}
                              className={
                                index % 2 === 0
                                  ? "bg-background"
                                  : "bg-muted/30"
                              }
                            >
                              <td className="px-4 py-2 text-sm">
                                {item.product?.name || "Unknown"}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {item.product?.sku || "N/A"}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {item.location}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Stock Take Photos */}
                {stockTake.pictures && (
                  <>
                    <Separator className="my-4" />
                    <h3 className="font-medium text-sm mb-2">Photos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {(() => {
                        const picturesToRender = processImagePaths(
                          stockTake.pictures
                        );

                        console.log("Stock take pictures data:", {
                          pictures: stockTake.pictures,
                          processed: picturesToRender,
                        });

                        return picturesToRender.length > 0 ? (
                          picturesToRender.map((pic: string, index: number) => {
                            const imgPath = getImageUrl(pic);

                            console.log(`Image ${index} path:`, {
                              original: pic,
                              processed: imgPath,
                            });

                            return (
                              <div
                                key={index}
                                className="border rounded-md overflow-hidden"
                              >
                                <img
                                  src={imgPath}
                                  alt={`Stock Take Photo ${index + 1}`}
                                  className="w-full h-32 object-cover"
                                  onError={(e) => {
                                    console.log(
                                      `Image load error for path: ${imgPath}`
                                    );
                                    const target = e.target as HTMLImageElement;
                                    target.src = getPlaceholderImageUrl();
                                  }}
                                />
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-full text-sm text-muted-foreground italic">
                            No stock take photos available
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

                {/* Comments */}
                {stockTake.comment && (
                  <>
                    <Separator className="my-4" />
                    <h3 className="font-medium text-sm mb-2">Comments</h3>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{stockTake.comment}</p>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No stock take data was submitted for this work item.</p>
                <p className="text-sm mt-2">
                  If this work item required inventory counting, the
                  merchandiser has not completed it yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Merchandising Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Tag className="h-5 w-5 mr-2" />
              Merchandising Data
            </CardTitle>
            <CardDescription>
              Product pricing and promotional information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {merchandising ? (
              <>
                {merchandising.items && merchandising.items.length > 0 && (
                  <>
                    <h3 className="font-medium text-sm mb-2">
                      Merchandising Items
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-border">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-border px-4 py-2 text-left text-sm font-medium">
                              Product
                            </th>
                            <th className="border border-border px-4 py-2 text-left text-sm font-medium">
                              SKU
                            </th>
                            <th className="border border-border px-4 py-2 text-left text-sm font-medium">
                              Price
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {merchandising.items.map(
                            (item: any, index: number) => (
                              <tr
                                key={index}
                                className={
                                  index % 2 === 0
                                    ? "bg-background"
                                    : "bg-muted/30"
                                }
                              >
                                <td className="px-4 py-2 text-sm">
                                  {item.productName || "Unknown"}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {item.productSku || "N/A"}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  ${(item.price / 100).toFixed(2)}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Merchandising Photos */}
                {merchandising.promotionPictures && (
                  <>
                    <Separator className="my-4" />
                    <h3 className="font-medium text-sm mb-2">
                      Merchandising Photos
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {(() => {
                        const picturesToRender = processImagePaths(
                          merchandising.promotionPictures
                        );

                        return picturesToRender.length > 0 ? (
                          picturesToRender.map((pic: string, index: number) => {
                            const imgPath = getImageUrl(pic);

                            return (
                              <div
                                key={index}
                                className="border rounded-md overflow-hidden"
                              >
                                <img
                                  src={imgPath}
                                  alt={`Merchandising Photo ${index + 1}`}
                                  className="w-full h-32 object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = getPlaceholderImageUrl();
                                  }}
                                />
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-full text-sm text-muted-foreground italic">
                            No merchandising photos available
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No merchandising data was submitted for this work item.</p>
                <p className="text-sm mt-2">
                  If this work item included merchandising tasks, the
                  merchandiser has not completed them yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Order Data
            </CardTitle>
            <CardDescription>
              Product ordering and restocking information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {order ? (
              <>
                {order.items && order.items.length > 0 && (
                  <>
                    <h3 className="font-medium text-sm mb-2">Order Items</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-border">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-border px-4 py-2 text-left text-sm font-medium">
                              Product
                            </th>
                            <th className="border border-border px-4 py-2 text-left text-sm font-medium">
                              SKU
                            </th>
                            <th className="border border-border px-4 py-2 text-left text-sm font-medium">
                              Quantity
                            </th>
                            <th className="border border-border px-4 py-2 text-left text-sm font-medium">
                              Unit Price
                            </th>
                            <th className="border border-border px-4 py-2 text-left text-sm font-medium">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item: any, index: number) => (
                            <tr
                              key={index}
                              className={
                                index % 2 === 0
                                  ? "bg-background"
                                  : "bg-muted/30"
                              }
                            >
                              <td className="px-4 py-2 text-sm">
                                {item.product?.name || "Unknown"}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {item.product?.sku || "N/A"}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                ${(item.product?.price / 100).toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                $
                                {(
                                  (item.product?.price * item.quantity) /
                                  100
                                ).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Order Photos */}
                {order.pictures && (
                  <>
                    <Separator className="my-4" />
                    <h3 className="font-medium text-sm mb-2">Order Photos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {(() => {
                        const picturesToRender = processImagePaths(
                          order.pictures
                        );

                        return picturesToRender.length > 0 ? (
                          picturesToRender.map((pic: string, index: number) => {
                            const imgPath = getImageUrl(pic);

                            return (
                              <div
                                key={index}
                                className="border rounded-md overflow-hidden"
                              >
                                <img
                                  src={imgPath}
                                  alt={`Order Photo ${index + 1}`}
                                  className="w-full h-32 object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = getPlaceholderImageUrl();
                                  }}
                                />
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-full text-sm text-muted-foreground italic">
                            No order photos available
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

                {/* Order Notes */}
                {order.notes && (
                  <>
                    <Separator className="my-4" />
                    <h3 className="font-medium text-sm mb-2">Order Notes</h3>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{order.notes}</p>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No order data was submitted for this work item.</p>
                <p className="text-sm mt-2">
                  If this work item involved product ordering, the merchandiser
                  did not submit any order information or no products were below
                  the threshold for reordering.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkItemSummary;
