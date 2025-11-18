import logoIcon from "@/assets/payfesa-logo-icon.jpg";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-12 mb-8 md:mb-12">
          <div className="col-span-2 lg:col-span-1">
            <div className="mb-3 md:mb-4 flex items-center gap-2">
              <img src={logoIcon} alt="PayFesa Icon" className="h-8 w-8 md:h-10 md:w-10" />
              <span className="text-xl md:text-2xl font-bold text-primary">PayFesa</span>
            </div>
            <p className="text-xs md:text-sm text-charcoal">
              Helping Malawians save money together through online chipereganyu groups.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold mb-3 md:mb-4 text-sm md:text-base">Support</h3>
            <ul className="space-y-1.5 md:space-y-2 text-charcoal text-xs md:text-sm">
              <li><Link to="/help" className="hover:text-primary transition-colors">Help Centre</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-3 md:mb-4 text-sm md:text-base">Connect</h3>
            <ul className="space-y-1.5 md:space-y-2 text-charcoal text-xs md:text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Facebook</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Instagram</a></li>
            </ul>
          </div>
          
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-bold mb-3 md:mb-4 text-sm md:text-base">Legal</h3>
            <ul className="space-y-1.5 md:space-y-2 text-charcoal text-xs md:text-sm">
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border pt-6 md:pt-8 text-center text-charcoal">
          <p className="text-xs md:text-sm">© 2025 PayFesa. All rights reserved. Online chipereganyu for Malawi.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
