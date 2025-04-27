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
  Store
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: UserRole[];
};

const navigationItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: <Package className="h-5 w-5" />,
  },
  {
    href: "/products",
    label: "Products",
    icon: <Tags className="h-5 w-5" />,
  },
  {
    href: "/stores",
    label: "Stores",
    icon: <Store className="h-5 w-5" />,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: <Bell className="h-5 w-5" />,
  },
  {
    href: "/users",
    label: "User Management",
    icon: <Users className="h-5 w-5" />,
    roles: [UserRole.ADMIN],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: <Settings className="h-5 w-5" />,
    roles: [UserRole.ADMIN],
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
          <ul className="space-y-1 px-2">
            {navigationItems.map((item) => {
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
                        "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
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
