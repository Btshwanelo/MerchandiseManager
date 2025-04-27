import { useLocation } from "wouter";
import { Search, Bell, HelpCircle, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export const Header = ({ onMobileMenuToggle }: HeaderProps) => {
  const [location] = useLocation();

  // Get page title based on current route
  const pageTitle = useMemo(() => {
    const path = location === "/" ? "dashboard" : location.slice(1);
    return path.charAt(0).toUpperCase() + path.slice(1);
  }, [location]);

  return (
    <header className="bg-white shadow-sm border-b border-neutral-200 p-4 flex items-center justify-between">
      <div className="flex items-center">
        <Button
          variant="ghost" 
          size="icon"
          className="md:hidden mr-4"
          onClick={onMobileMenuToggle}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <h2 className="text-lg font-medium text-foreground">{pageTitle}</h2>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search..."
            className="pl-10 w-[200px] lg:w-[300px]"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
          <span className="sr-only">Notifications</span>
        </Button>

        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>
      </div>
    </header>
  );
};
