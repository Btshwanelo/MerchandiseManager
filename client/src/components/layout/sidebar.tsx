import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import {
  LayoutDashboard,
  Package,
  Tags,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Store,
  ClipboardCheck,
  Tag,
  FileText,
  FileSpreadsheet,
  ShoppingCart,
  Laptop,
  Activity,
  ClipboardList,
  Calendar,
  ChevronDown,
  ChevronRight,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

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
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    section: "core",
    roles: [UserRole.ADMIN, UserRole.MANAGER]
  },
  {
    href: "/my-assignments",
    label: "My Assignments",
    icon: <ClipboardList className="h-5 w-5" />,
    section: "core",
    roles: [UserRole.MERCHANDISER]
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: <Package className="h-5 w-5" />,
    section: "core",
    roles: [UserRole.MANAGER] // Only for Manager
  },
  {
    href: "/products",
    label: "Products",
    icon: <Tags className="h-5 w-5" />,
    section: "core",
    roles: [UserRole.ADMIN, UserRole.MANAGER]
  },
  {
    href: "/stores",
    label: "Stores",
    icon: <Store className="h-5 w-5" />,
    section: "core",
    roles: [UserRole.ADMIN, UserRole.MANAGER]
  },
  
  // Merchandising section - Available to all roles
  {
    href: "/stock-take",
    label: "Stock Take",
    icon: <ClipboardCheck className="h-5 w-5" />,
    section: "merchandising",
    roles: [UserRole.MANAGER, UserRole.MERCHANDISER] // Now only allow Manager and Merchandiser roles
  },
  {
    href: "/work-items",
    label: "Work Items",
    icon: <ClipboardList className="h-5 w-5" />,
    section: "merchandising",
    roles: [UserRole.ADMIN] // Only for Admin
  },
  {
    href: "/merchandising",
    label: "Merchandising",
    icon: <Tag className="h-5 w-5" />,
    section: "merchandising",
    roles: [UserRole.MANAGER, UserRole.MERCHANDISER] // Exclude ADMIN
  },
  {
    href: "/competitor-merchandising",
    label: "Competitor",
    icon: <Laptop className="h-5 w-5" />,
    section: "merchandising",
    roles: [UserRole.MANAGER, UserRole.MERCHANDISER] // Exclude ADMIN
  },
  {
    href: "/flows",
    label: "Flows",
    icon: <FileText className="h-5 w-5" />,
    section: "merchandising",
    roles: [UserRole.MANAGER] // Exclude ADMIN
  },
  {
    href: "/assignments",
    label: "Store Assignments",
    icon: <Calendar className="h-5 w-5" />,
    section: "merchandising",
    roles: [UserRole.ADMIN, UserRole.MANAGER]
  },

  // Documents & Orders
  {
    href: "/product-sheets",
    label: "Product Sheets",
    icon: <FileText className="h-5 w-5" />,
    section: "documents",
    roles: [UserRole.MANAGER]
  },
  {
    href: "/list-prices",
    label: "List Prices",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    section: "documents",
    roles: [UserRole.MANAGER]
  },
  {
    href: "/deals",
    label: "Deals",
    icon: <Tag className="h-5 w-5" />,
    section: "documents",
    roles: [UserRole.MANAGER]
  },
  {
    href: "/orders",
    label: "Orders",
    icon: <ShoppingCart className="h-5 w-5" />,
    section: "documents",
    roles: [UserRole.MANAGER, UserRole.MERCHANDISER]
  },
  
  // Reporting & Admin
  {
    href: "/reports",
    label: "Reports",
    icon: <BarChart3 className="h-5 w-5" />,
    section: "admin",
    roles: [UserRole.ADMIN, UserRole.MANAGER]
  },
  // Alerts removed as requested
  {
    href: "/users",
    label: "User Management",
    icon: <Users className="h-5 w-5" />,
    roles: [UserRole.ADMIN],
    section: "admin"
  },
  {
    href: "/all-activities",
    label: "System Activities",
    icon: <Activity className="h-5 w-5" />,
    roles: [UserRole.ADMIN],
    section: "admin"
  },
  // Settings hidden as requested
  // {
  //   href: "/settings",
  //   label: "Settings",
  //   icon: <Settings className="h-5 w-5" />,
  //   roles: [UserRole.ADMIN],
  //   section: "admin"
  // },
];

interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className }: SidebarProps) => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [merchandisingMenuOpen, setMerchandisingMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleMerchandisingMenu = () => {
    setMerchandisingMenuOpen(!merchandisingMenuOpen);
  };

  const userRole = user?.role as UserRole;

  return (
    <aside
      className={cn(
        "w-64 bg-white shadow-md z-10 flex flex-col h-screen fixed",
        className
      )}
    >
      <div className="p-4 border-b border-neutral-200 flex items-center">
        <img src="/images/reimagined-logo.png" alt="Re-Imagined Excellence Logo" className="h-10" />
      </div>

      {/* User profile information */}
      <div className="p-4 border-b border-neutral-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center space-x-3 cursor-pointer">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{user?.name || "User"}</p>
                <p className="text-sm text-muted-foreground capitalize">{user?.role || "Guest"}</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                <p className="text-xs leading-none text-muted-foreground capitalize mt-1">{user?.role}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href="/user-profile">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
              </Link>
              {user?.role === UserRole.ADMIN && (
                <Link href="/users">
                  <DropdownMenuItem>
                    <Users className="mr-2 h-4 w-4" />
                    <span>User Management</span>
                  </DropdownMenuItem>
                </Link>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
              {logoutMutation.isPending && <span className="ml-2">...</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation menu */}
      <ScrollArea className="flex-1 py-4">
        <nav>
          {userRole && (
            <>
              {/* For Merchandiser Role: Special Navigation Layout */}
              {userRole === UserRole.MERCHANDISER ? (
                <>
                  {/* My Assignments - Always visible at the top */}
                  <div className="mb-4">
                    <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Main
                    </h3>
                    <ul className="space-y-1 px-2">
                      {navigationItems
                        .filter(item => item.href === "/my-assignments" && item.roles?.includes(UserRole.MERCHANDISER))
                        .map((item) => {
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

                  {/* Merchandising Section - Collapsible */}
                  <div className="mb-4">
                    <div 
                      className="px-4 py-1 flex items-center justify-between cursor-pointer hover:bg-neutral-50 rounded-md"
                      onClick={toggleMerchandisingMenu}
                    >
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Merchandising
                      </h3>
                      {merchandisingMenuOpen ? 
                        <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                    
                    {/* Merchandising Items - Only visible when expanded */}
                    {merchandisingMenuOpen && (
                      <ul className="space-y-1 px-2 mt-1">
                        {navigationItems
                          .filter(item => 
                            // All merchandising items except My Assignments
                            item.section === "merchandising" && 
                            item.href !== "/my-assignments" &&
                            (!item.roles || item.roles.includes(userRole))
                          )
                          .map((item) => {
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
                    )}
                  </div>

                  {/* Documents Section */}
                  {navigationItems.filter(item => 
                    item.section === "documents" && 
                    (!item.roles || item.roles.includes(userRole))
                  ).length > 0 && (
                    <div className="mb-4">
                      <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Documents
                      </h3>
                      <ul className="space-y-1 px-2">
                        {navigationItems
                          .filter(item => 
                            item.section === "documents" &&
                            (!item.roles || item.roles.includes(userRole))
                          )
                          .map((item) => {
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
                  )}
                </>
              ) : (
                // For Admin and Manager Roles: Regular Navigation Layout
                <>
                  {/* Core Section */}
                  {navigationItems.filter(item => 
                    item.section === "core" && 
                    (!item.roles || item.roles.includes(userRole))
                  ).length > 0 && (
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
                                  </a>
                                </Link>
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  )}

                  {/* Merchandising Section */}
                  {navigationItems.filter(item => 
                    item.section === "merchandising" && 
                    (!item.roles || item.roles.includes(userRole))
                  ).length > 0 && (
                    <div className="mb-4">
                      <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Merchandising
                      </h3>
                      <ul className="space-y-1 px-2">
                        {navigationItems
                          .filter(item => 
                            item.section === "merchandising" &&
                            (!item.roles || item.roles.includes(userRole))
                          )
                          .map((item) => {
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
                  )}

                  {/* Documents Section */}
                  {navigationItems.filter(item => 
                    item.section === "documents" && 
                    (!item.roles || item.roles.includes(userRole))
                  ).length > 0 && (
                    <div className="mb-4">
                      <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Documents
                      </h3>
                      <ul className="space-y-1 px-2">
                        {navigationItems
                          .filter(item => 
                            item.section === "documents" &&
                            (!item.roles || item.roles.includes(userRole))
                          )
                          .map((item) => {
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
                  )}

                  {/* Admin Section */}
                  {navigationItems.filter(item => 
                    item.section === "admin" && 
                    (!item.roles || item.roles.includes(userRole))
                  ).length > 0 && (
                    <div>
                      <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Administration
                      </h3>
                      <ul className="space-y-1 px-2">
                        {navigationItems
                          .filter(item => 
                            item.section === "admin" &&
                            (!item.roles || item.roles.includes(userRole))
                          )
                          .map((item) => {
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
                  )}
                </>
              )}
            </>
          )}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-neutral-200">
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span>Log out</span>
          {logoutMutation.isPending && <span className="ml-2">...</span>}
        </Button>
      </div>
    </aside>
  );
};