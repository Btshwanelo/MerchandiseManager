import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock, File, FileText, Info, ShoppingCart, Tag, Store as StoreIcon, User } from "lucide-react";
import { WorkItemStatus } from "@shared/schema";
import { Link } from "wouter";
import { getImageUrl, processImagePaths, getPlaceholderImageUrl } from "@/lib/image-utils";

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
          {stockTake ? (
            <>
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
                      // Debug output to understand what we've received
                      console.log("Stock take pictures data:", {
                        pictures: stockTake.pictures,
                        type: typeof stockTake.pictures,
                        isArray: Array.isArray(stockTake.pictures)
                      });
                      
                      const picturesToRender = processImagePaths(stockTake.pictures);
                      
                      console.log("Pictures to render:", picturesToRender);
                      
                      return picturesToRender.length > 0 ? (
                        picturesToRender.map((pic: string, index: number) => {
                          const imgPath = getImageUrl(pic);
                          
                          console.log(`Image ${index} path:`, { original: pic, processed: imgPath });
                          
                          return (
                            <div key={index} className="border rounded-md overflow-hidden">
                              <img 
                                src={imgPath} 
                                alt={`Stock Take Photo ${index + 1}`}
                                className="w-full h-32 object-cover"
                                onError={(e) => {
                                  console.log(`Image load error for path: ${imgPath}`);
                                  const target = e.target as HTMLImageElement;
                                  target.src = getPlaceholderImageUrl();
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
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No stock take data was submitted for this work item.</p>
              <p className="text-sm mt-2">If this work item included a stock take task, the merchandiser has not completed the stock count yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Merchandising Fieldset */}
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
          {merchandising ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-sm mb-2">Overview</h3>
                  <div className="space-y-1">
                    <div className="grid grid-cols-2">
                      <div className="text-sm text-muted-foreground">Date:</div>
                      <div className="text-sm font-medium">{merchandising.date ? formatDate(merchandising.date) : "N/A"}</div>
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="text-sm text-muted-foreground">Store:</div>
                      <div className="text-sm font-medium">{formatValue(workItem.store?.name)}</div>
                    </div>
                    {merchandising.promotionName && (
                      <div className="grid grid-cols-2">
                        <div className="text-sm text-muted-foreground">Promotion:</div>
                        <div className="text-sm font-medium">{formatValue(merchandising.promotionName)}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {merchandising.notes && (
                  <div>
                    <h3 className="font-medium text-sm mb-2">Notes</h3>
                    <p className="text-sm">{merchandising.notes}</p>
                  </div>
                )}
              </div>
              
              {/* Merchandising Items */}
              {merchandising.items && merchandising.items.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h3 className="font-medium text-sm mb-2">Merchandised Products</h3>
                  <div className="border rounded-md overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">SKU</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Position</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {merchandising.items.map((item: any, index: number) => (
                          <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <td className="px-4 py-2 text-sm">{item.product?.name || "Unknown"}</td>
                            <td className="px-4 py-2 text-sm">{item.product?.sku || "N/A"}</td>
                            <td className="px-4 py-2 text-sm">{item.position || "N/A"}</td>
                            <td className="px-4 py-2 text-sm">{item.notes || "-"}</td>
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
                  <h3 className="font-medium text-sm mb-2">Photos</h3>
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
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No merchandising data was submitted for this work item.</p>
              <p className="text-sm mt-2">If this work item included merchandising tasks, the merchandiser has not completed them yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Competitor Merchandising Fieldset */}
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
          {competitorMerchandising ? (
            <>
              {/* Debug output */}
              {console.log("Competitor merchandising data:", competitorMerchandising)}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-sm mb-2">Overview</h3>
                  <div className="space-y-1">
                    <div className="grid grid-cols-2">
                      <div className="text-sm text-muted-foreground">Date:</div>
                      <div className="text-sm font-medium">{competitorMerchandising.date ? formatDate(competitorMerchandising.date) : "N/A"}</div>
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="text-sm text-muted-foreground">Competitor Brand:</div>
                      <div className="text-sm font-medium">{formatValue(competitorMerchandising.brand)}</div>
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="text-sm text-muted-foreground">Store:</div>
                      <div className="text-sm font-medium">{formatValue(workItem.store?.name)}</div>
                    </div>
                    {competitorMerchandising.promotionalPrice !== undefined && (
                      <div className="grid grid-cols-2">
                        <div className="text-sm text-muted-foreground">Promotional Price:</div>
                        <div className="text-sm font-medium">
                          R {(competitorMerchandising.promotionalPrice / 100).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {competitorMerchandising.productDescription && (
                  <div>
                    <h3 className="font-medium text-sm mb-2">Product Description</h3>
                    <p className="text-sm">{competitorMerchandising.productDescription}</p>
                  </div>
                )}
              </div>
              
              {/* Single competitor item - our current format */}
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
                            {competitorMerchandising.promotionalPrice !== undefined
                              ? `R ${(competitorMerchandising.promotionalPrice / 100).toFixed(2)}`
                              : "N/A"
                            }
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              
              {/* Multiple competitor items format - for future support */}
              {competitorMerchandising.items && Array.isArray(competitorMerchandising.items) && competitorMerchandising.items.length > 0 && (
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
                            <td className="px-4 py-2 text-sm">{item.productName || item.productDescription || "Unknown"}</td>
                            <td className="px-4 py-2 text-sm">{item.brand || "N/A"}</td>
                            <td className="px-4 py-2 text-sm">
                              {item.price !== undefined 
                                ? `R ${(item.price / 100).toFixed(2)}` 
                                : item.promotionalPrice !== undefined
                                  ? `R ${(item.promotionalPrice / 100).toFixed(2)}`
                                  : "N/A"
                              }
                            </td>
                            <td className="px-4 py-2 text-sm">{item.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              
              {/* Competitor Photos */}
              {competitorMerchandising.promotionPictures && (
                <>
                  <Separator className="my-4" />
                  <h3 className="font-medium text-sm mb-2">Photos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(() => {
                      console.log("Competitor photos data:", competitorMerchandising.promotionPictures);
                      
                      // Get the photos array
                      let photoArray: string[] = [];
                      
                      if (typeof competitorMerchandising.promotionPictures === 'string') {
                        // If it's a JSON string, try to parse it
                        try {
                          const parsed = JSON.parse(competitorMerchandising.promotionPictures);
                          photoArray = Array.isArray(parsed) ? parsed : [competitorMerchandising.promotionPictures];
                        } catch (e) {
                          // If parsing fails, it's just a single string path
                          photoArray = [competitorMerchandising.promotionPictures];
                        }
                      } else if (Array.isArray(competitorMerchandising.promotionPictures)) {
                        // If it's already an array, use it directly
                        photoArray = competitorMerchandising.promotionPictures;
                      }
                      
                      // Filter out empty strings and null values
                      photoArray = photoArray.filter(path => !!path && path.trim() !== '');
                      
                      console.log("Processed photo array:", photoArray);
                      
                      return photoArray.length > 0 ? (
                        photoArray.map((photoPath: string, index: number) => {
                          // Process the image path to ensure it works
                          let imgPath = '';
                          
                          if (photoPath.startsWith('http')) {
                            // Full URL
                            imgPath = photoPath;
                          } else if (photoPath.startsWith('/uploads/')) {
                            // Path with leading slash - use as is
                            imgPath = photoPath;
                          } else if (photoPath.includes('uploads/')) {
                            // Path with uploads but no leading slash
                            imgPath = `/${photoPath}`;
                          } else {
                            // Just a filename
                            imgPath = `/uploads/${photoPath}`;
                          }
                          
                          // Try to use the API endpoint for better error handling
                          // Extract just the filename for use with the image API
                          const filename = photoPath.split('/').pop();
                          if (filename) {
                            imgPath = `/api/images/${filename}`;
                          }
                          
                          console.log(`Competitor photo ${index} path:`, { original: photoPath, processed: imgPath });
                          
                          return (
                            <div key={index} className="border rounded-md overflow-hidden">
                              <img 
                                src={imgPath}
                                alt={`Competitor Photo ${index + 1}`}
                                className="w-full h-32 object-cover"
                                onError={(e) => {
                                  console.log(`Failed to load competitor image: ${imgPath}`);
                                  const target = e.target as HTMLImageElement;
                                  
                                  // Try a fallback path with the uploads prefix if not already tried
                                  const filename = photoPath.split('/').pop();
                                  if (filename && !imgPath.includes('/uploads/')) {
                                    target.src = `/uploads/${filename}`;
                                    // Add a second error handler for the fallback path
                                    target.onerror = () => {
                                      target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect><circle cx='8.5' cy='8.5' r='1.5'></circle><polyline points='21 15 16 10 5 21'></polyline></svg>";
                                    };
                                  } else {
                                    // Use inline SVG placeholder to avoid another potential 404
                                    target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect><circle cx='8.5' cy='8.5' r='1.5'></circle><polyline points='21 15 16 10 5 21'></polyline></svg>";
                                  }
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
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No competitor analysis was submitted for this work item.</p>
              <p className="text-sm mt-2">If this work item included competitor analysis, the merchandiser has not completed this section yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Fieldset */}
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
          {order ? (
            <>
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
              {(order.pictures || stockTake?.pictures) && (
                <>
                  <Separator className="my-4" />
                  <h3 className="font-medium text-sm mb-2">Photos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(() => {
                      console.log("Order photos data:", order.pictures);
                      console.log("Stock take photos data (for order):", stockTake?.pictures);
                      
                      // Get the photos array - prioritize order pictures, fallback to stock take pictures
                      let photoArray: string[] = [];
                      
                      // First try order pictures
                      if (order.pictures) {
                        if (typeof order.pictures === 'string') {
                          try {
                            const parsed = JSON.parse(order.pictures);
                            photoArray = Array.isArray(parsed) ? parsed : [order.pictures];
                          } catch (e) {
                            photoArray = [order.pictures];
                          }
                        } else if (Array.isArray(order.pictures)) {
                          photoArray = order.pictures;
                        } else if (order.pictures && typeof order.pictures === 'object') {
                          photoArray = Object.keys(order.pictures).length > 0 
                            ? Object.values(order.pictures).map(v => String(v))
                            : [];
                        }
                      }
                      
                      // If no order pictures, try stock take pictures (since orders are often generated from stock takes)
                      if (photoArray.length === 0 && stockTake?.pictures) {
                        if (typeof stockTake.pictures === 'string') {
                          try {
                            const parsed = JSON.parse(stockTake.pictures);
                            photoArray = Array.isArray(parsed) ? parsed : [stockTake.pictures];
                          } catch (e) {
                            photoArray = [stockTake.pictures];
                          }
                        } else if (Array.isArray(stockTake.pictures)) {
                          photoArray = stockTake.pictures;
                        } else if (stockTake.pictures && typeof stockTake.pictures === 'object') {
                          photoArray = Object.keys(stockTake.pictures).length > 0 
                            ? Object.values(stockTake.pictures).map(v => String(v))
                            : [];
                        }
                      }
                      
                      // Filter out falsy values and empty strings
                      photoArray = photoArray
                        .filter(Boolean)
                        .filter(p => typeof p === 'string' && p.trim && p.trim() !== '');
                        
                      // Ensure all entries are strings
                      photoArray = photoArray.map(p => String(p));
                      
                      console.log("Final order pictures to render:", photoArray);
                      
                      return photoArray.length > 0 ? (
                        photoArray.map((pic: string, index: number) => {
                          // Clean up path - handle different path formats
                          let imgPath;
                          
                          if (pic.startsWith('http')) {
                            // Use as is if it's a complete URL
                            imgPath = pic;
                          } else if (pic.includes('uploads/')) {
                            // If it's already a path with uploads directory
                            if (pic.startsWith('/uploads/')) {
                              // If it starts with /uploads/, use as is
                              imgPath = pic;
                            } else {
                              // Prepend / if needed
                              imgPath = `/${pic}`;
                            }
                          } else if (pic.includes('/')) {
                            // If it has any other path separators, try to extract just the filename
                            const filename = pic.split('/').pop();
                            imgPath = `/uploads/${filename}`;
                          } else {
                            // Assume it's just a filename
                            imgPath = `/uploads/${pic}`;
                          }
                          
                          console.log(`Order image ${index} path:`, { original: pic, processed: imgPath });
                          
                          return (
                            <div key={index} className="border rounded-md overflow-hidden">
                              <img 
                                src={imgPath}
                                alt={`Order Photo ${index + 1}`}
                                className="w-full h-32 object-cover"
                                onError={(e) => {
                                  console.log(`Failed to load order image: ${imgPath}`);
                                  const target = e.target as HTMLImageElement;
                                  
                                  // Try a fallback path with the uploads prefix if not already tried
                                  const filename = pic.split('/').pop();
                                  if (filename && !imgPath.includes('/uploads/')) {
                                    target.src = `/uploads/${filename}`;
                                    // Add a second error handler for the fallback path
                                    target.onerror = () => {
                                      target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect><circle cx='8.5' cy='8.5' r='1.5'></circle><polyline points='21 15 16 10 5 21'></polyline></svg>";
                                    };
                                  } else {
                                    // Use inline SVG placeholder to avoid another potential 404
                                    target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect><circle cx='8.5' cy='8.5' r='1.5'></circle><polyline points='21 15 16 10 5 21'></polyline></svg>";
                                  }
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
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No order data was submitted for this work item.</p>
              <p className="text-sm mt-2">If this work item involved product ordering, the merchandiser did not submit any order information or no products were below the threshold for reordering.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkItemSummary;