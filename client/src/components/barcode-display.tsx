import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeDisplayProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
  text?: string;
}

export function BarcodeDisplay({
  value,
  format = "CODE128",
  width = 2,
  height = 50,
  displayValue = true,
  className = "",
  text
}: BarcodeDisplayProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format,
          width,
          height,
          displayValue,
          text: text || value,
          font: "monospace",
          fontSize: 14,
          margin: 10,
          background: "#ffffff",
        });
      } catch (error) {
        console.error("Error generating barcode:", error);
        // If there's an error, at least show something
        if (barcodeRef.current) {
          // Clear previous content
          while (barcodeRef.current.firstChild) {
            barcodeRef.current.removeChild(barcodeRef.current.firstChild);
          }
          
          // Add text showing there was an error
          const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
          textEl.setAttribute("x", "10");
          textEl.setAttribute("y", "20");
          textEl.setAttribute("fill", "red");
          textEl.textContent = "Invalid barcode value";
          barcodeRef.current.appendChild(textEl);
          
          // Add the value as text
          const valueEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
          valueEl.setAttribute("x", "10");
          valueEl.setAttribute("y", "40");
          valueEl.textContent = value;
          barcodeRef.current.appendChild(valueEl);
        }
      }
    }
  }, [value, format, width, height, displayValue, text]);

  return (
    <div className={className}>
      <svg ref={barcodeRef} className="w-full"></svg>
    </div>
  );
}

export default BarcodeDisplay;