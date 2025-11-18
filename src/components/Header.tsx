import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logoIcon from "@/assets/payfesa-logo-icon.jpg";
import MobileMenu from "./MobileMenu";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoIcon} alt="PayFesa Icon" className="h-10 w-10" />
            <span className="text-2xl font-bold text-primary">PayFesa</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link to="/how-it-works">How It Works</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link to="/help">Help</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
              <Link to="/auth">Login</Link>
            </Button>
            <Button asChild size="sm" className="hidden md:inline-flex bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <Link to="/auth">Sign Up</Link>
            </Button>
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
