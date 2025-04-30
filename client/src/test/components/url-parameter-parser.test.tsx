// Unit tests for URL parameter parsing logic used in ProcessForm

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { useLocation } from "wouter";

// Create a mock version of our parameter parsing logic for isolated testing
const parseUrlParameters = (location: string) => {
  let workItemId = 0;
  let storeId = 0;

  try {
    // Handle different URL formats (hash, query params, etc.)
    let queryString = "";
    if (location.includes("?")) {
      queryString = location.split("?")[1];
    } else if (location.includes("#") && location.split("#")[1].includes("?")) {
      queryString = location.split("#")[1].split("?")[1];
    }
    
    const searchParams = new URLSearchParams(queryString);
    
    // Parse the workItemId and make sure it's a valid number
    const rawWorkItemId = searchParams.get("workItemId");
    if (rawWorkItemId && !isNaN(Number(rawWorkItemId))) {
      workItemId = parseInt(rawWorkItemId);
    }
    
    // Parse the storeId and make sure it's a valid number
    const rawStoreId = searchParams.get("storeId");
    if (rawStoreId && !isNaN(Number(rawStoreId))) {
      storeId = parseInt(rawStoreId);
    }
  } catch (error) {
    console.error("Error parsing URL parameters:", error);
  }

  return { workItemId, storeId };
};

// Mock component that uses the parameter parsing logic
const TestUrlParser = () => {
  const [location] = useLocation();
  const { workItemId, storeId } = parseUrlParameters(location);
  
  return (
    <div>
      <h1>URL Parser Test</h1>
      <div data-testid="workItemId">{workItemId}</div>
      <div data-testid="storeId">{storeId}</div>
      <div data-testid="currentLocation">{location}</div>
    </div>
  );
};

// Mock wouter's useLocation hook
vi.mock("wouter", () => ({
  useLocation: vi.fn(),
}));

describe("URL Parameter Parser", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should parse valid workItemId and storeId from URL", () => {
    (useLocation as any).mockReturnValue(["/process-form?workItemId=5&storeId=10"]);
    
    render(<TestUrlParser />);
    
    expect(screen.getByTestId("workItemId").textContent).toBe("5");
    expect(screen.getByTestId("storeId").textContent).toBe("10");
  });

  it("should handle missing parameters", () => {
    (useLocation as any).mockReturnValue(["/process-form"]);
    
    render(<TestUrlParser />);
    
    expect(screen.getByTestId("workItemId").textContent).toBe("0");
    expect(screen.getByTestId("storeId").textContent).toBe("0");
  });

  it("should handle partially missing parameters", () => {
    (useLocation as any).mockReturnValue(["/process-form?workItemId=15"]);
    
    render(<TestUrlParser />);
    
    expect(screen.getByTestId("workItemId").textContent).toBe("15");
    expect(screen.getByTestId("storeId").textContent).toBe("0");
  });

  it("should handle invalid parameter values", () => {
    (useLocation as any).mockReturnValue(["/process-form?workItemId=abc&storeId=xyz"]);
    
    render(<TestUrlParser />);
    
    expect(screen.getByTestId("workItemId").textContent).toBe("0");
    expect(screen.getByTestId("storeId").textContent).toBe("0");
  });

  it("should handle hash-based routes with query parameters", () => {
    (useLocation as any).mockReturnValue(["/#/process-form?workItemId=7&storeId=12"]);
    
    render(<TestUrlParser />);
    
    expect(screen.getByTestId("workItemId").textContent).toBe("7");
    expect(screen.getByTestId("storeId").textContent).toBe("12");
  });

  it("should handle encoded characters in parameters", () => {
    (useLocation as any).mockReturnValue(["/process-form?workItemId=8&storeId=15&name=Test%20Store"]);
    
    render(<TestUrlParser />);
    
    expect(screen.getByTestId("workItemId").textContent).toBe("8");
    expect(screen.getByTestId("storeId").textContent).toBe("15");
  });

  // Direct testing of the parsing function
  describe("parseUrlParameters function", () => {
    it("should parse standard URL format", () => {
      const { workItemId, storeId } = parseUrlParameters("/process-form?workItemId=1&storeId=2");
      expect(workItemId).toBe(1);
      expect(storeId).toBe(2);
    });

    it("should handle empty URL", () => {
      const { workItemId, storeId } = parseUrlParameters("");
      expect(workItemId).toBe(0);
      expect(storeId).toBe(0);
    });

    it("should handle URL with only path", () => {
      const { workItemId, storeId } = parseUrlParameters("/process-form");
      expect(workItemId).toBe(0);
      expect(storeId).toBe(0);
    });

    it("should handle zero values", () => {
      const { workItemId, storeId } = parseUrlParameters("/process-form?workItemId=0&storeId=0");
      expect(workItemId).toBe(0);
      expect(storeId).toBe(0);
    });

    it("should handle negative values", () => {
      const { workItemId, storeId } = parseUrlParameters("/process-form?workItemId=-5&storeId=-10");
      expect(workItemId).toBe(-5);
      expect(storeId).toBe(-10);
    });
  });
});