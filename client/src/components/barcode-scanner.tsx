import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Camera, StopCircle, QrCode, Barcode } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string, decodedResult: any) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
  className?: string;
}

export function BarcodeScanner({
  onScanSuccess,
  onScanError,
  onClose,
  className = ""
}: BarcodeScannerProps) {
  const [scannerReady, setScannerReady] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("camera");
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "html5qr-code-full-region";

  // Clean up the scanner when component unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop()
          .catch(error => console.error("Error stopping scanner:", error));
      }
    };
  }, [scanning]);

  // Initialize scanner
  useEffect(() => {
    if (!scannerRef.current) {
      try {
        scannerRef.current = new Html5Qrcode(scannerContainerId);
        setScannerReady(true);
      } catch (err) {
        setError("Failed to initialize scanner. Please ensure you're using a supported device and browser.");
        console.error("Scanner initialization error:", err);
      }
    }
  }, []);

  // Start camera scanning
  const startScan = useCallback(async () => {
    if (!scannerRef.current || scanning) return;
    
    setError(null);
    
    try {
      // Check for camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      setPermissionGranted(true);
      
      const qrCodeSuccessCallback = (decodedText: string, decodedResult: any) => {
        onScanSuccess(decodedText, decodedResult);
      };

      const config = { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1
      };

      await scannerRef.current.start(
        { facingMode: "environment" }, 
        config,
        qrCodeSuccessCallback,
        undefined
      );
      
      setScanning(true);
    } catch (err: any) {
      setScanning(false);
      
      // Check for permission errors
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionGranted(false);
        setError("Camera access was denied. Please grant permission to use the camera.");
      } else {
        setError(`Failed to start scanner: ${err.message || "Unknown error"}`);
      }
      
      if (onScanError) {
        onScanError(err.message || "Failed to start scanner");
      }
      
      console.error("Scanner start error:", err);
    }
  }, [scanning, onScanSuccess, onScanError]);

  // Stop scanning
  const stopScan = useCallback(async () => {
    if (!scannerRef.current || !scanning) return;
    
    try {
      await scannerRef.current.stop();
      setScanning(false);
    } catch (err) {
      console.error("Error stopping scanner:", err);
    }
  }, [scanning]);

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="camera">
              <Camera className="mr-2 h-4 w-4" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Barcode className="mr-2 h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {permissionGranted === false && (
              <Alert className="mb-4 bg-amber-50 border-amber-500">
                <AlertTitle>Camera Permission Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access in your browser settings and try again.
                </AlertDescription>
              </Alert>
            )}

            <div className="relative">
              <div 
                id={scannerContainerId} 
                className="w-full h-64 overflow-hidden rounded-md bg-muted"
              >
                {!scannerReady && (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {!scanning ? (
                <Button 
                  onClick={startScan} 
                  className="mt-4 w-full"
                  disabled={!scannerReady || permissionGranted === false}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Start Scanning
                </Button>
              ) : (
                <Button 
                  onClick={stopScan} 
                  variant="outline" 
                  className="mt-4 w-full"
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  Stop Scanning
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground text-center mt-2">
              Point your camera at a product barcode or QR code
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="text-center p-6">
              <input
                type="text"
                placeholder="Enter barcode manually"
                className="w-full p-2 border rounded"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value;
                    if (value) {
                      onScanSuccess(value, { result: { text: value } });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Type the barcode number and press Enter
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {onClose && (
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BarcodeScanner;