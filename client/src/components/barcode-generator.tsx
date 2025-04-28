import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle } from 'lucide-react';

interface BarcodeGeneratorProps {
  value: string;
  format?: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  flat?: boolean;
  textMargin?: number;
  className?: string;
}

export function BarcodeGenerator({
  value,
  format = 'CODE128',
  title = 'Product Barcode',
  description = 'Scan this barcode to identify the product',
  width = 2,
  height = 100,
  displayValue = true,
  fontSize = 20,
  flat = false,
  textMargin = 2,
  className = '',
}: BarcodeGeneratorProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (!barcodeRef.current || !value.trim()) return;

    try {
      JsBarcode(barcodeRef.current, value, {
        format,
        width,
        height,
        displayValue,
        fontSize,
        flat,
        textMargin,
        valid: (valid) => {
          if (!valid) {
            setError(`Could not generate a valid ${format} barcode with value: ${value}`);
          } else {
            setError(null);
          }
        },
      });
    } catch (err) {
      setError(`Barcode generation error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [value, format, width, height, displayValue, fontSize, flat, textMargin]);

  const downloadBarcode = () => {
    if (!barcodeRef.current) return;

    const svgData = new XMLSerializer().serializeToString(barcodeRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Unable to get 2D context for canvas');
      return;
    }

    // Create an image to draw to canvas
    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions to match the SVG
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image
      ctx.drawImage(img, 0, 0);
      
      // Download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `barcode-${value}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    
    // Load SVG data as base64 image
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="bg-white p-4 rounded-md w-full flex justify-center mb-4">
              <svg ref={barcodeRef} className="w-full"></svg>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadBarcode}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Barcode
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}