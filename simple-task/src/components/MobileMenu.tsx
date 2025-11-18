import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Home, HelpCircle, Info, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSwipeable } from "react-swipeable";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const MobileMenu = () => {
  const [open, setOpen] = useState(false);

  // Swipe handlers for closing menu with improved touch support
  const handlers = useSwipeable({
    onSwipedRight: () => setOpen(false),
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
    delta: 10, // Sensitivity threshold
  });

  const menuItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/how-it-works", label: "How It Works", icon: HelpCircle },
    { to: "/help", label: "Help", icon: HelpCircle },
    { to: "/about", label: "About", icon: Info },
    { to: "/contact", label: "Contact", icon: Mail },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden min-h-[44px] min-w-[44px] touch-manipulation"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-[85vw] max-w-[340px] animate-slide-in-right touch-manipulation"
        {...handlers}
      >
        <SheetHeader className="mb-8">
          <SheetTitle className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Menu
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group text-base font-medium transition-all duration-200 py-4 px-4 rounded-xl hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 min-h-[52px] flex items-center gap-3 active:scale-[0.98] touch-manipulation border border-transparent hover:border-primary/20"
                onClick={() => setOpen(false)}
              >
                <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="group-hover:text-primary transition-colors">
                  {item.label}
                </span>
              </Link>
            );
          })}
          
          <div className="flex flex-col gap-3 mt-8 pt-6 border-t border-border">
            <Button 
              asChild 
              variant="outline" 
              size="lg"
              className="w-full min-h-[52px] text-base active:scale-[0.98] transition-all duration-200 touch-manipulation border-2"
              onClick={() => setOpen(false)}
            >
              <Link to="/auth">Login</Link>
            </Button>
            <Button 
              asChild 
              size="lg"
              className="w-full min-h-[52px] text-base bg-gradient-to-r from-primary to-accent hover:opacity-90 active:scale-[0.98] transition-all duration-200 touch-manipulation shadow-lg"
              onClick={() => setOpen(false)}
            >
              <Link to="/auth">Sign Up</Link>
            </Button>
          </div>
        </nav>
        
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            Swipe right to close
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
