import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency values
export function formatCurrency(value: number, currency = "ZAR", style: 'currency' | 'decimal' | 'percent' | 'unit' = "currency") {
  return new Intl.NumberFormat("en-ZA", {
    style,
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    currencyDisplay: 'symbol'
  }).format(value / 100); // Convert cents to Rands
}

// Calculate percentage of current stock relative to minimum stock level
export function calculateStockPercentage(currentQuantity: number, minStockLevel: number) {
  return (currentQuantity / minStockLevel) * 100;
}

// Determine stock status based on current quantity and minimum stock level
export function getStockStatus(currentQuantity: number, minStockLevel: number) {
  const percentage = calculateStockPercentage(currentQuantity, minStockLevel);
  
  if (percentage <= 50) {
    return {
      label: "Critical",
      color: "bg-destructive text-destructive-foreground",
      progressColor: "bg-destructive"
    };
  } else if (percentage <= 100) {
    return {
      label: "Low",
      color: "bg-warning text-warning-foreground",
      progressColor: "bg-warning"
    };
  } else {
    return {
      label: "Good",
      color: "bg-success text-success-foreground",
      progressColor: "bg-success"
    };
  }
}

// Format date to a human-readable string
export function formatDate(date: Date | string) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  
  // If it's today
  if (
    dateObj.getDate() === now.getDate() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getFullYear() === now.getFullYear()
  ) {
    return `Today, ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // If it's yesterday
  if (
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()
  ) {
    return `Yesterday, ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Otherwise, return the date
  return dateObj.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
