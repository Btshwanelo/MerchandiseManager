import React from "react";
import { 
  ClipboardList, 
  Tag, 
  BarChart, 
  ShoppingCart, 
  ImageIcon,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  auditTrail
}: AdminDataOverviewProps) {
  return (
    <div className="mt-8 border-t pt-8">
      <h2 className="text-2xl font-bold mb-6 text-primary">Admin Data Overview</h2>
      
      <div className="space-y-6">
        {/* Tabs for different data types */}
        <Tabs defaultValue="stock-take" className="w-full">
          <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 lg:flex">
            <TabsTrigger value="stock-take" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span>Stock Take</span>
            </TabsTrigger>
            <TabsTrigger value="merchandising" className="flex items-center gap-2">
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
                        <h3 className="text-sm font-medium mb-1">Submitted Date</h3>
                        <p>{stockTake.date ? new Date(stockTake.date).toLocaleString() : 'Not available'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-1">Status</h3>
                        <Badge variant={stockTake.status === 'completed' ? 'success' : 'default'}>
                          {stockTake.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Inventory Items ({stockTake.items?.length || 0})</h3>
                      <div className="border rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">SKU</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Min Level</th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {stockTake.items?.map((item: any) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3 text-sm">{item.product?.name || 'Unknown Product'}</td>
                                <td className="px-4 py-3 text-sm">{item.product?.sku || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm">
                                  <Badge variant="outline" className="capitalize">
                                    {item.location.replace('_', ' ')}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={item.quantity < (item.product?.minStockLevel || 0) ? 'text-red-600 font-medium' : ''}>
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm">{item.product?.minStockLevel || 'N/A'}</td>
                              </tr>
                            ))}
                            {!stockTake.items?.length && (
                              <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
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
                        <h3 className="text-sm font-medium mb-2">Shelf Images ({stockTake.pictures.length})</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {stockTake.pictures.map((image: string, index: number) => (
                            <div 
                              key={index} 
                              className="relative aspect-square rounded-md overflow-hidden border hover:shadow-md transition-shadow"
                              onClick={() => window.open(image, '_blank')}
                            >
                              <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <div className="absolute inset-0 hover:bg-black/10 transition-colors flex items-center justify-center cursor-pointer">
                                <span className="sr-only">View Image</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                                Image {index + 1}
                              </div>
                            </div>
                          ))}
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
                        <h3 className="text-sm font-medium mb-1">Created Date</h3>
                        <p>{merchandisingData.createdAt ? new Date(merchandisingData.createdAt).toLocaleString() : 'Not available'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Promotional Items</h3>
                      <div className="border rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {merchandisingData.items?.map((item: any, index: number) => (
                              <tr key={index}>
                                <td className="px-4 py-3 text-sm">{item.product?.name || 'Unknown Product'}</td>
                                <td className="px-4 py-3 text-sm">R {item.price.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm">{item.notes || 'No notes'}</td>
                              </tr>
                            ))}
                            {!merchandisingData.items?.length && (
                              <tr>
                                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
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
                        <h3 className="text-sm font-medium mb-2">Additional Notes</h3>
                        <div className="border rounded-md p-4 bg-muted/30">
                          <p>{merchandisingData.comment}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Show promotion images if available */}
                    {merchandisingData.promotionPictures && merchandisingData.promotionPictures.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Promotion Images ({merchandisingData.promotionPictures.length})</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {merchandisingData.promotionPictures.map((image: string, index: number) => (
                            <div 
                              key={index} 
                              className="relative aspect-square rounded-md overflow-hidden border hover:shadow-md transition-shadow"
                              onClick={() => window.open(image, '_blank')}
                            >
                              <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <div className="absolute inset-0 hover:bg-black/10 transition-colors flex items-center justify-center cursor-pointer">
                                <span className="sr-only">View Image</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                                Image {index + 1}
                              </div>
                            </div>
                          ))}
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
                  Competitor Analysis
                </CardTitle>
                <CardDescription>
                  Competitor data submitted by merchandiser
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!competitorData ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No competitor analysis data available for this work item.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-1">Created Date</h3>
                        <p>{competitorData.createdAt ? new Date(competitorData.createdAt).toLocaleString() : 'Not available'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-1">Competitor Name</h3>
                        <p>{competitorData.competitorName || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Competitor Products ({competitorData.items?.length || 0})</h3>
                      <div className="border rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Product Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {competitorData.items?.map((item: any, index: number) => (
                              <tr key={index}>
                                <td className="px-4 py-3 text-sm">{item.productName || 'Unnamed Product'}</td>
                                <td className="px-4 py-3 text-sm">{item.brand || 'Unknown'}</td>
                                <td className="px-4 py-3 text-sm">R {item.price.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm">{item.notes || 'No notes'}</td>
                              </tr>
                            ))}
                            {!competitorData.items?.length && (
                              <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                                  No competitor products recorded
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {competitorData.generalNotes && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">General Observations</h3>
                        <div className="border rounded-md p-4 bg-muted/30">
                          <p>{competitorData.generalNotes}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Show competitor images if available */}
                    {competitorData.pictures && competitorData.pictures.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Competitor Images ({competitorData.pictures.length})</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {competitorData.pictures.map((image: string, index: number) => (
                            <div 
                              key={index} 
                              className="relative aspect-square rounded-md overflow-hidden border hover:shadow-md transition-shadow"
                              onClick={() => window.open(image, '_blank')}
                            >
                              <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <div className="absolute inset-0 hover:bg-black/10 transition-colors flex items-center justify-center cursor-pointer">
                                <span className="sr-only">View Image</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                                Image {index + 1}
                              </div>
                            </div>
                          ))}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-1">Order Date</h3>
                        <p>{orderData.orderDate ? new Date(orderData.orderDate).toLocaleString() : 'Not available'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-1">Status</h3>
                        <Badge variant={
                          orderData.status === 'completed' 
                            ? 'success' 
                            : orderData.status === 'rejected' 
                              ? 'destructive' 
                              : 'default'
                        }>
                          {orderData.status}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-1">Total Items</h3>
                        <p>{orderData.items?.length || 0}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Ordered Items</h3>
                      <div className="border rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">SKU</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit Price</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {orderData.items?.map((item: any, index: number) => (
                              <tr key={index}>
                                <td className="px-4 py-3 text-sm">{item.product?.name || 'Unknown Product'}</td>
                                <td className="px-4 py-3 text-sm">{item.product?.sku || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm">{item.quantity}</td>
                                <td className="px-4 py-3 text-sm">R {item.product?.price ? (item.product.price / 100).toFixed(2) : '0.00'}</td>
                                <td className="px-4 py-3 text-sm font-medium">
                                  R {item.product?.price ? ((item.product.price * item.quantity) / 100).toFixed(2) : '0.00'}
                                </td>
                              </tr>
                            ))}
                            {!orderData.items?.length && (
                              <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                                  No items in this order
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {orderData.notes && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Order Notes</h3>
                        <div className="border rounded-md p-4 bg-muted/30">
                          <p>{orderData.notes}</p>
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
    </div>
  );
}