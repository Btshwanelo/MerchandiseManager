import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, Scan, X } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
  supportedFormats?: string[];
}

export function BarcodeScanner({
  onScanSuccess,
  onScanError,
  onClose,
  supportedFormats = ['QR_CODE', 'EAN_13', 'CODE_128'],
}: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('camera');
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Initialize the scanner
  useEffect(() => {
    if (!scannerContainerRef.current) return;

    const scannerContainerId = 'barcode-scanner-container';
    scannerContainerRef.current.id = scannerContainerId;

    scannerRef.current = new Html5Qrcode(scannerContainerId);
    setIsInitialized(true);

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Start the scanner
  const startScanner = async () => {
    if (!scannerRef.current || !isInitialized) return;

    setPermissionError(null);
    setIsScanning(true);

    try {
      await scannerRef.current.start(
        { facingMode: cameraFacing },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScanSuccess(decodedText);
          // Don't stop scanning automatically to allow continuous scanning
        },
        (errorMessage) => {
          // Errors while scanning are ignored to avoid disrupting the scan loop
          // but you can handle them here if needed
        }
      );
    } catch (error) {
      setIsScanning(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Permission')) {
        setPermissionError('Camera access denied. Please allow camera access to scan barcodes.');
      } else {
        setPermissionError('Failed to start scanner: ' + errorMessage);
      }
      
      if (onScanError) {
        onScanError(errorMessage);
      }
    }
  };

  // Stop the scanner
  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
      setIsScanning(false);
    }
  };

  // Toggle camera facing mode (front/back)
  const toggleCamera = async () => {
    if (isScanning) {
      await stopScanner();
      setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
      // Restart scanner after a brief delay to allow the camera to switch
      setTimeout(() => {
        startScanner();
      }, 300);
    } else {
      setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'camera') {
      if (!isScanning) {
        startScanner();
      }
    } else {
      stopScanner();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Scan Barcode/QR Code</CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Position the barcode or QR code within the frame to scan
        </CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="camera" value={activeTab} onValueChange={handleTabChange}>
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera">
              <Scan className="h-4 w-4 mr-2" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="file" disabled>
              <QrCode className="h-4 w-4 mr-2" />
              File Upload
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="camera" className="p-0">
          <CardContent className="pt-4">
            <div className="relative">
              <div 
                ref={scannerContainerRef} 
                className="w-full h-64 bg-muted rounded-md overflow-hidden"
              ></div>
              
              {!isInitialized && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              
              {permissionError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-4 text-center">
                  <div className="space-y-3">
                    <p className="text-destructive">{permissionError}</p>
                    <Button onClick={startScanner}>Try Again</Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2 mt-4">
              <Switch id="camera-switch" checked={cameraFacing === 'user'} onCheckedChange={toggleCamera} />
              <Label htmlFor="camera-switch">Front camera</Label>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button variant="secondary" onClick={stopScanner} disabled={!isScanning}>
              Pause
            </Button>
            <Button onClick={startScanner} disabled={isScanning}>
              {isScanning ? 'Scanning...' : 'Start Scanning'}
            </Button>
          </CardFooter>
        </TabsContent>

        <TabsContent value="file">
          <CardContent className="pt-4">
            <div className="text-center text-muted-foreground py-8">
              File upload scanner coming soon...
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}