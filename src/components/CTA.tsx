import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import storeBadges from "@/assets/store-badges.png";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const CTA = () => {
  const { ref, isVisible } = useScrollAnimation();
  const navigate = useNavigate();

  return (
    <section 
      ref={ref}
      className={`py-12 sm:py-16 md:py-20 lg:py-32 bg-gradient-to-br from-primary via-accent to-primary text-primary-foreground relative overflow-hidden transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6 md:space-y-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
            Start Saving Today. Join PayFesa.
          </h2>
          
          <p className="text-sm sm:text-base md:text-xl lg:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed">
            Every payout is protected. See everything in real time. Build your trust score and earn bonuses.
          </p>

          <Button 
            onClick={() => navigate('/auth')}
            size="lg"
            className="bg-white text-primary hover:bg-white/90 font-semibold text-sm sm:text-base md:text-lg px-5 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 touch-feedback min-h-[48px]"
          >
            Create Your Account
            <ArrowRight className="ml-2 h-4 md:h-5 w-4 md:w-5" />
          </Button>
          
          <div className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4 pt-2 md:pt-4">
            <p className="text-xs md:text-sm opacity-90">Download PayFesa App</p>
            <img src={storeBadges} alt="Download on App Store and Google Play" className="h-20 sm:h-24 md:h-32 w-auto mx-auto" loading="lazy" />
          </div>
          
          <p className="text-xs md:text-sm opacity-75 pt-1 md:pt-4">
            Fully Protected. Fully Transparent. Built for Community.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
