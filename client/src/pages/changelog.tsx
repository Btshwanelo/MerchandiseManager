import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, ArrowLeft, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Define a type for our changelog entries
type ChangelogEntry = {
  version: string;
  date: string;
  highlights: string[];
  features: string[];
  improvements: string[];
  bugfixes: string[];
};

// Define our changelog data (most recent first)
const changelogData: ChangelogEntry[] = [
  {
    version: "1.3.0",
    date: "May 2, 2025",
    highlights: [
      "Fixed user-specific work item permissions to ensure merchandisers only see their own assigned items",
      "Added input validation to prevent foreign key constraint errors in orders and competitor data",
      "Enhanced process form to properly handle completed work items with improved UI indicators"
    ],
    features: [
      "Read-only mode for completed work items with clear visual indicators",
      "Improved error reporting with detailed messages for all form submissions"
    ],
    improvements: [
      "Enhanced UI for stock take submissions with better validation feedback",
      "Optimized inventory tracking for faster load times and better performance",
      "Updated user permissions logic to strictly enforce user-specific assignments"
    ],
    bugfixes: [
      "Fixed issue where merchandisers could see all store work items instead of only their assigned ones",
      "Resolved foreign key constraint errors in competitor data submissions",
      "Fixed issue with order status not properly updating after submission",
      "Corrected process form display issues for work items with missing data"
    ]
  },
  {
    version: "1.2.0",
    date: "April 25, 2025",
    highlights: [
      "Added bulk CSV import/export capabilities for inventory data",
      "Enhanced role-based permissions system for better access control",
      "Improved store assignment workflow with automatic work item creation"
    ],
    features: [
      "CSV import tool with case-insensitive store/shelf matching",
      "Store assignments now automatically create associated work items",
      "Added audit log for tracking all inventory changes"
    ],
    improvements: [
      "Enhanced dashboard with real-time inventory statistics",
      "Improved mobile responsiveness across all pages",
      "Added intelligent low-stock prompting with threshold configuration"
    ],
    bugfixes: [
      "Fixed incorrect stock level calculations in summary reports",
      "Resolved user interface issues in store assignment workflow",
      "Fixed login session expiration handling"
    ]
  },
  {
    version: "1.1.0",
    date: "April 15, 2025",
    highlights: [
      "Multi-store inventory visualization",
      "Role-based access control system",
      "Improved merchandising workflow"
    ],
    features: [
      "Added competitor analysis module for merchandisers",
      "New order management system with status tracking",
      "Store manager dashboard with performance metrics"
    ],
    improvements: [
      "Enhanced product search with filters and sorting",
      "Updated UI/UX for better usability",
      "Improved shelf and store location management"
    ],
    bugfixes: [
      "Fixed stock level synchronization issues",
      "Resolved user authentication problems",
      "Fixed reporting inconsistencies"
    ]
  },
  {
    version: "1.0.0",
    date: "April 1, 2025",
    highlights: [
      "Initial release of InvenTrack inventory management system",
      "Core inventory tracking functionality",
      "Basic user management"
    ],
    features: [
      "Product inventory management",
      "Stock location tracking (shelf/back store)",
      "User authentication and authorization"
    ],
    improvements: [],
    bugfixes: []
  }
];

const ChangelogPage = () => {
  const [, navigate] = useLocation();

  return (
    <div className="container py-8 px-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">InvenTrack Changelog</h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/auth")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Login
        </Button>
      </div>
      
      <p className="text-muted-foreground mb-8">
        Track the latest updates, improvements, and bug fixes to the InvenTrack platform.
      </p>
      
      <div className="space-y-10">
        {changelogData.map((release, index) => (
          <Card key={release.version} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-xl">Version {release.version}</CardTitle>
                    {index === 0 && (
                      <Badge className="bg-blue-600">Latest</Badge>
                    )}
                  </div>
                  <CardDescription>{release.date}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {release.highlights.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg flex items-center mb-3">
                    <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
                    Highlights
                  </h3>
                  <ul className="space-y-2 pl-7 list-disc">
                    {release.highlights.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {release.features.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3">New Features</h3>
                  <ul className="space-y-2 pl-7 list-disc">
                    {release.features.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {release.improvements.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3">Improvements</h3>
                  <ul className="space-y-2 pl-7 list-disc">
                    {release.improvements.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {release.bugfixes.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Bug Fixes</h3>
                  <ul className="space-y-2 pl-7 list-disc">
                    {release.bugfixes.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ChangelogPage;