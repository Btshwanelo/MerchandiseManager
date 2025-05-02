import { useLocation } from "wouter";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import {
  LayoutDashboard,
  Package,
  Tags,
  Bell,
  MoreHorizontal
} from "lucide-react";

const mobileNavItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: <Package className="h-5 w-5" />,
    roles: [UserRole.MANAGER, UserRole.MERCHANDISER] // Exclude ADMIN
  },
  {
    href: "/products",
    label: "Products",
    icon: <Tags className="h-5 w-5" />,
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: <Bell className="h-5 w-5" />,
    badge: true,
  },
  {
    href: "#more",
    label: "More",
    icon: <MoreHorizontal className="h-5 w-5" />,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      // Toggle more menu functionality would go here
    },
  },
];

export const MobileNav = () => {
  const [location] = useLocation();
  const { user } = useAuth();
  const userRole = user?.role as UserRole;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-2 flex justify-around z-10">
      {mobileNavItems
        .filter(item => !item.roles || (userRole && item.roles.includes(userRole)))
        .map((item) => {
        const isActive = item.href === location;
        
        return (
          <Link href={item.href} key={item.href}>
            <a
              className="flex flex-col items-center p-2"
              onClick={item.onClick}
            >
              <div className={cn(
                "relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.icon}
                {item.badge && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full"></span>
                )}
              </div>
              <span className={cn(
                "text-xs mt-1",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </a>
          </Link>
        );
      })}
    </nav>
  );
};
