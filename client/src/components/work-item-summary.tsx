import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock, File, FileText, Info, ShoppingCart, Tag, Store as StoreIcon, User } from "lucide-react";
import { WorkItemStatus } from "@shared/schema";
import { Link } from "wouter";

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

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{workItem.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={workItem.status === WorkItemStatus.COMPLETED ? "success" : 
                           workItem.status === WorkItemStatus.IN_PROGRESS ? "default" : "outline"}>
                {workItem.status?.replace("_", " ")}
              </Badge>
              <Badge variant="outline">{workItem.type?.replace("_", " ")}</Badge>
            </div>
          </div>
        </div>
        
        {workItem.description && (
          <div className="mt-4 bg-muted/50 p-4 rounded-md">
            <p className="text-sm text-muted-foreground">{workItem.description}</p>
          </div>
        )}
      </div>

      {/* Work Item Details Fieldset */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Info className="h-5 w-5 mr-2 text-muted-foreground" />
            Work Item Details
          </CardTitle>
          <CardDescription>
            Basic information about the work item
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-sm mb-2">General Information</h3>
              <div className="space-y-1">
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Status:</div>
                  <div className="text-sm font-medium">{formatValue(workItem.status?.replace("_", " "))}</div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Type:</div>
                  <div className="text-sm font-medium">{formatValue(workItem.type?.replace("_", " "))}</div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Priority:</div>
                  <div className="text-sm font-medium">{formatValue(workItem.priority)}</div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Created On:</div>
                  <div className="text-sm font-medium">{formatDate(workItem.createdAt)}</div>
                </div>
                {workItem.completedAt && (
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Completed On:</div>
                    <div className="text-sm font-medium">{formatDate(workItem.completedAt)}</div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-sm mb-2">Location & Assignment</h3>
              <div className="space-y-1">
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Store Name:</div>
                  <div className="text-sm font-medium">{formatValue(workItem.store?.name)}</div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Store Location:</div>
                  <div className="text-sm font-medium">{formatValue(workItem.store?.location)}</div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Due Date:</div>
                  <div className="text-sm font-medium">{workItem.dueDate ? formatDate(workItem.dueDate) : "N/A"}</div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Assigned To:</div>
                  <div className="text-sm font-medium">{formatValue(workItem.user?.name || "You")}</div>
                </div>
              </div>
            </div>
          </div>
          
          {workItem.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="font-medium text-sm mb-2">Notes</h3>
                <p className="text-sm">{workItem.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stock Take Fieldset */}
      {stockTake && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
              Stock Take Data
            </CardTitle>
            <CardDescription>
              Stock take information submitted for this work item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-sm mb-2">Overview</h3>
                <div className="space-y-1">
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Date:</div>
                    <div className="text-sm font-medium">{stockTake.date ? formatDate(stockTake.date) : "N/A"}</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Status:</div>
                    <div className="text-sm font-medium">{formatValue(stockTake.status)}</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Store:</div>
                    <div className="text-sm font-medium">{formatValue(stockTake.store?.name || workItem.store?.name)}</div>
                  </div>
                </div>
              </div>
              
              {stockTake.comment && (
                <div>
                  <h3 className="font-medium text-sm mb-2">Comments</h3>
                  <p className="text-sm">{stockTake.comment}</p>
                </div>
              )}
            </div>
            
            {/* Stock Take Items */}
            {stockTake.items && stockTake.items.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="font-medium text-sm mb-2">Stock Items</h3>
                <div className="border rounded-md overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">SKU</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stockTake.items.map((item: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <td className="px-4 py-2 text-sm">{item.product?.name || "Unknown"}</td>
                          <td className="px-4 py-2 text-sm">{item.product?.sku || "N/A"}</td>
                          <td className="px-4 py-2 text-sm">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm">{item.location}</td>
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
                    // Handle different possible picture formats
                    let picturesToRender: string[] = [];
                    
                    if (typeof stockTake.pictures === 'string') {
                      // Try to parse if it's a JSON string
                      try {
                        const parsed = JSON.parse(stockTake.pictures);
                        picturesToRender = Array.isArray(parsed) ? parsed : [stockTake.pictures];
                      } catch (e) {
                        // If parsing fails, assume it's a single path
                        picturesToRender = [stockTake.pictures];
                      }
                    } else if (Array.isArray(stockTake.pictures)) {
                      picturesToRender = stockTake.pictures;
                    }
                    
                    // Filter out falsy values and empty strings
                    picturesToRender = picturesToRender.filter(Boolean);
                    
                    return picturesToRender.length > 0 ? (
                      picturesToRender.map((pic: string, index: number) => {
                        // Clean up path - handle different path formats
                        const imgPath = pic.startsWith('http') 
                          ? pic 
                          : pic.includes('uploads/') 
                            ? `/api/${pic}` 
                            : `/api/uploads/${pic.replace(/^uploads[\/\\]/, '')}`;
                            
                        return (
                          <div key={index} className="border rounded-md overflow-hidden">
                            <img 
                              src={imgPath} 
                              alt={`Stock Take Photo ${index + 1}`}
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                console.log(`Image load error for path: ${imgPath}`);
                                const target = e.target as HTMLImageElement;
                                target.src = "/images/placeholder.png";
                              }}
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full text-sm text-muted-foreground italic">
                        No photos available
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Merchandising Fieldset */}
      {merchandising && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Tag className="h-5 w-5 mr-2 text-muted-foreground" />
              Merchandising Data
            </CardTitle>
            <CardDescription>
              Merchandising information submitted for this work item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-sm mb-2">Overview</h3>
                <div className="space-y-1">
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Date:</div>
                    <div className="text-sm font-medium">{merchandising.createdAt ? formatDate(merchandising.createdAt) : "N/A"}</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Store:</div>
                    <div className="text-sm font-medium">{formatValue(workItem.store?.name)}</div>
                  </div>
                </div>
              </div>
              
              {merchandising.comment && (
                <div>
                  <h3 className="font-medium text-sm mb-2">Notes</h3>
                  <p className="text-sm">{merchandising.comment}</p>
                </div>
              )}
            </div>
            
            {/* Merchandising Items */}
            {merchandising.items && merchandising.items.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="font-medium text-sm mb-2">Promotion Items</h3>
                <div className="border rounded-md overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Price (R)</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {merchandising.items.map((item: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <td className="px-4 py-2 text-sm">{item.product?.name || "Unknown"}</td>
                          <td className="px-4 py-2 text-sm">R {item.price.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm">{item.notes || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            
            {/* Merchandising Photos */}
            {merchandising.promotionPictures && merchandising.promotionPictures.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="font-medium text-sm mb-2">Promotion Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {merchandising.promotionPictures.map((pic: string, index: number) => (
                    <div key={index} className="border rounded-md overflow-hidden">
                      <img 
                        src={pic.startsWith('http') ? pic : `/api/uploads/${pic}`} 
                        alt={`Merchandising Photo ${index + 1}`}
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/placeholder.png";
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Competitor Merchandising Fieldset */}
      {competitorMerchandising && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <File className="h-5 w-5 mr-2 text-muted-foreground" />
              Competitor Analysis
            </CardTitle>
            <CardDescription>
              Competitor merchandising information submitted for this work item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-sm mb-2">Overview</h3>
                <div className="space-y-1">
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Date:</div>
                    <div className="text-sm font-medium">{competitorMerchandising.date ? formatDate(competitorMerchandising.date) : "N/A"}</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Competitor Name:</div>
                    <div className="text-sm font-medium">{formatValue(competitorMerchandising.competitorName || competitorMerchandising.brand)}</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Store:</div>
                    <div className="text-sm font-medium">{formatValue(workItem.store?.name)}</div>
                  </div>
                </div>
              </div>
              
              {competitorMerchandising.generalNotes && (
                <div>
                  <h3 className="font-medium text-sm mb-2">General Notes</h3>
                  <p className="text-sm">{competitorMerchandising.generalNotes}</p>
                </div>
              )}
            </div>
            
            {/* Competitor Items */}
            {competitorMerchandising.items && competitorMerchandising.items.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="font-medium text-sm mb-2">Competitor Products</h3>
                <div className="border rounded-md overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Brand</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Price (R)</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {competitorMerchandising.items.map((item: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <td className="px-4 py-2 text-sm">{item.productName || "Unknown"}</td>
                          <td className="px-4 py-2 text-sm">{item.brand || "N/A"}</td>
                          <td className="px-4 py-2 text-sm">R {item.price?.toFixed(2) || "N/A"}</td>
                          <td className="px-4 py-2 text-sm">{item.notes || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            
            {/* Single competitor item support for older data format */}
            {competitorMerchandising.brand && competitorMerchandising.productDescription && (
              <>
                <Separator className="my-4" />
                <h3 className="font-medium text-sm mb-2">Competitor Product</h3>
                <div className="border rounded-md overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Brand</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Price (R)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-background">
                        <td className="px-4 py-2 text-sm">{competitorMerchandising.brand}</td>
                        <td className="px-4 py-2 text-sm">{competitorMerchandising.productDescription}</td>
                        <td className="px-4 py-2 text-sm">
                          R {competitorMerchandising.promotionalPrice?.toFixed(2) || "N/A"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
            
            {/* Competitor Photos */}
            {(competitorMerchandising.pictures || competitorMerchandising.promotionPictures) && (
              <>
                <Separator className="my-4" />
                <h3 className="font-medium text-sm mb-2">Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(() => {
                    // Handle different possible picture formats
                    let picturesToRender: string[] = [];
                    
                    // Combine pictures and promotionPictures
                    if (competitorMerchandising.pictures) {
                      const pics = competitorMerchandising.pictures;
                      if (typeof pics === 'string') {
                        try {
                          const parsed = JSON.parse(pics);
                          picturesToRender = picturesToRender.concat(Array.isArray(parsed) ? parsed : [pics]);
                        } catch (e) {
                          picturesToRender.push(pics);
                        }
                      } else if (Array.isArray(pics)) {
                        picturesToRender = picturesToRender.concat(pics);
                      }
                    }
                    
                    if (competitorMerchandising.promotionPictures) {
                      const promosPics = competitorMerchandising.promotionPictures;
                      if (typeof promosPics === 'string') {
                        try {
                          const parsed = JSON.parse(promosPics);
                          picturesToRender = picturesToRender.concat(Array.isArray(parsed) ? parsed : [promosPics]);
                        } catch (e) {
                          picturesToRender.push(promosPics);
                        }
                      } else if (Array.isArray(promosPics)) {
                        picturesToRender = picturesToRender.concat(promosPics);
                      }
                    }
                    
                    // Filter out duplicates, empty strings and null/undefined
                    picturesToRender = [...new Set(picturesToRender)].filter(Boolean);
                    
                    return picturesToRender.length > 0 ? (
                      picturesToRender.map((pic: string, index: number) => {
                        // Clean up path - handle different path formats
                        const imgPath = pic.startsWith('http') 
                          ? pic 
                          : pic.includes('uploads/') 
                            ? `/api/${pic}` 
                            : `/api/uploads/${pic.replace(/^uploads[\/\\]/, '')}`;
                            
                        return (
                          <div key={index} className="border rounded-md overflow-hidden">
                            <img 
                              src={imgPath} 
                              alt={`Competitor Photo ${index + 1}`}
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                console.log(`Image load error for competitor photo: ${imgPath}`);
                                const target = e.target as HTMLImageElement;
                                target.src = "/images/placeholder.png";
                              }}
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full text-sm text-muted-foreground italic">
                        No competitor photos available
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Fieldset */}
      {order && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-muted-foreground" />
              Order Information
            </CardTitle>
            <CardDescription>
              Order details submitted for this work item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-sm mb-2">Overview</h3>
                <div className="space-y-1">
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Order Date:</div>
                    <div className="text-sm font-medium">{order.orderDate ? formatDate(order.orderDate) : "N/A"}</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Status:</div>
                    <div className="text-sm font-medium">{formatValue(order.status)}</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Store:</div>
                    <div className="text-sm font-medium">{formatValue(workItem.store?.name)}</div>
                  </div>
                </div>
              </div>
              
              {order.notes && (
                <div>
                  <h3 className="font-medium text-sm mb-2">Notes</h3>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
            </div>
            
            {/* Order Items */}
            {order.items && order.items.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="font-medium text-sm mb-2">Ordered Items</h3>
                <div className="border rounded-md overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">SKU</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Unit Price (R)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {order.items.map((item: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <td className="px-4 py-2 text-sm">{item.product?.name || "Unknown"}</td>
                          <td className="px-4 py-2 text-sm">{item.product?.sku || "N/A"}</td>
                          <td className="px-4 py-2 text-sm">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm">
                            {item.product?.price ? `R ${item.product.price.toFixed(2)}` : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            
            {/* Order Photos */}
            {order.pictures && order.pictures.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="font-medium text-sm mb-2">Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {order.pictures.map((pic: string, index: number) => (
                    <div key={index} className="border rounded-md overflow-hidden">
                      <img 
                        src={pic.startsWith('http') ? pic : `/api/uploads/${pic}`} 
                        alt={`Order Photo ${index + 1}`}
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/placeholder.png";
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkItemSummary;