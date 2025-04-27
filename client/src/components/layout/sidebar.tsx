import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import {
  LayoutDashboard,
  Package,
  Tags,
  BarChart3,
  Bell,
  Users,
  Settings,
  LogOut,
  Store,
  ClipboardCheck,
  Tag,
  FileText,
  FileSpreadsheet,
  ShoppingCart,
  Laptop
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  section?: string;
};

const navigationItems: NavItem[] = [
  // Core functionality
  {
    href: "/",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    section: "core"
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: <Package className="h-5 w-5" />,
    section: "core"
  },
  {
    href: "/products",
    label: "Products",
    icon: <Tags className="h-5 w-5" />,
    section: "core"
  },
  {
    href: "/stores",
    label: "Stores",
    icon: <Store className="h-5 w-5" />,
    section: "core"
  },
  
  // Merchandising section
  {
    href: "/stock-take",
    label: "Stock Take",
    icon: <ClipboardCheck className="h-5 w-5" />,
    section: "merchandising"
  },
  {
    href: "/merchandising",
    label: "Merchandising",
    icon: <Tag className="h-5 w-5" />,
    section: "merchandising"
  },
  {
    href: "/competitor-merchandising",
    label: "Competitor",
    icon: <Laptop className="h-5 w-5" />,
    section: "merchandising"
  },
  {
    href: "/flows",
    label: "Flows",
    icon: <FileText className="h-5 w-5" />,
    section: "merchandising"
  },

  // Documents & Orders
  {
    href: "/product-sheets",
    label: "Product Sheets",
    icon: <FileText className="h-5 w-5" />,
    section: "documents"
  },
  {
    href: "/list-prices",
    label: "List Prices",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    section: "documents"
  },
  {
    href: "/deals",
    label: "Deals",
    icon: <Tag className="h-5 w-5" />,
    section: "documents"
  },
  {
    href: "/orders",
    label: "Orders",
    icon: <ShoppingCart className="h-5 w-5" />,
    section: "documents"
  },
  
  // Reporting & Admin
  {
    href: "/reports",
    label: "Reports",
    icon: <BarChart3 className="h-5 w-5" />,
    section: "admin"
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: <Bell className="h-5 w-5" />,
    section: "admin"
  },
  {
    href: "/users",
    label: "User Management",
    icon: <Users className="h-5 w-5" />,
    roles: [UserRole.ADMIN],
    section: "admin"
  },
  {
    href: "/settings",
    label: "Settings",
    icon: <Settings className="h-5 w-5" />,
    roles: [UserRole.ADMIN],
    section: "admin"
  },
];

interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className }: SidebarProps) => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const userRole = user?.role as UserRole;

  return (
    <aside
      className={cn(
        "w-64 bg-white shadow-md z-10 flex flex-col h-screen fixed",
        className
      )}
    >
      <div className="p-4 border-b border-neutral-200 flex items-center space-x-3">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-medium text-foreground">InvenTrack</h1>
      </div>

      {/* User profile information */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-medium text-foreground">{user?.name || "User"}</p>
            <p className="text-sm text-muted-foreground capitalize">{user?.role || "Guest"}</p>
          </div>
        </div>
      </div>

      {/* Navigation menu */}
      <ScrollArea className="flex-1 py-4">
        <nav>
          {/* Core Section */}
          <div className="mb-4">
            <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Main
            </h3>
            <ul className="space-y-1 px-2">
              {navigationItems
                .filter(item => item.section === "core")
                .map((item) => {
                  // Hide items that are restricted by role
                  if (item.roles && !item.roles.includes(userRole)) {
                    return null;
                  }

                  const isActive = location === item.href;

                  return (
                    <li key={item.href}>
                      <Link href={item.href}>
                        <a
                          className={cn(
                            "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                            isActive
                              ? "bg-primary-foreground text-primary border-l-4 border-primary"
                              : "text-foreground hover:bg-neutral-100"
                          )}
                        >
                          {item.icon}
                          <span className="ml-3">{item.label}</span>
                          {item.label === "Alerts" && (
                            <span className="ml-auto bg-destructive text-white text-xs px-2 py-1 rounded-full">
                              5
                            </span>
                          )}
                        </a>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>

          {/* Merchandising Section */}
          <div className="mb-4">
            <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Merchandising
            </h3>
            <ul className="space-y-1 px-2">
              {navigationItems
                .filter(item => item.section === "merchandising")
                .map((item) => {
                  // Hide items that are restricted by role
                  if (item.roles && !item.roles.includes(userRole)) {
                    return null;
                  }

                  const isActive = location === item.href;

                  return (
                    <li key={item.href}>
                      <Link href={item.href}>
                        <a
                          className={cn(
                            "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                            isActive
                              ? "bg-primary-foreground text-primary border-l-4 border-primary"
                              : "text-foreground hover:bg-neutral-100"
                          )}
                        >
                          {item.icon}
                          <span className="ml-3">{item.label}</span>
                        </a>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>

          {/* Documents Section */}
          <div className="mb-4">
            <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Documents
            </h3>
            <ul className="space-y-1 px-2">
              {navigationItems
                .filter(item => item.section === "documents")
                .map((item) => {
                  // Hide items that are restricted by role
                  if (item.roles && !item.roles.includes(userRole)) {
                    return null;
                  }

                  const isActive = location === item.href;

                  return (
                    <li key={item.href}>
                      <Link href={item.href}>
                        <a
                          className={cn(
                            "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                            isActive
                              ? "bg-primary-foreground text-primary border-l-4 border-primary"
                              : "text-foreground hover:bg-neutral-100"
                          )}
                        >
                          {item.icon}
                          <span className="ml-3">{item.label}</span>
                        </a>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>

          {/* Admin Section */}
          <div>
            <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Administration
            </h3>
            <ul className="space-y-1 px-2">
              {navigationItems
                .filter(item => item.section === "admin")
                .map((item) => {
                  // Hide items that are restricted by role
                  if (item.roles && !item.roles.includes(userRole)) {
                    return null;
                  }

                  const isActive = location === item.href;

                  return (
                    <li key={item.href}>
                      <Link href={item.href}>
                        <a
                          className={cn(
                            "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                            isActive
                              ? "bg-primary-foreground text-primary border-l-4 border-primary"
                              : "text-foreground hover:bg-neutral-100"
                          )}
                        >
                          {item.icon}
                          <span className="ml-3">{item.label}</span>
                          {item.label === "Alerts" && (
                            <span className="ml-auto bg-destructive text-white text-xs px-2 py-1 rounded-full">
                              5
                            </span>
                          )}
                        </a>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        </nav>
      </ScrollArea>

      {/* Sign Out button */}
      <div className="p-4 border-t border-neutral-200">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
          {logoutMutation.isPending && (
            <span className="loading ml-2">...</span>
          )}
        </Button>
      </div>
    </aside>
  );
};
