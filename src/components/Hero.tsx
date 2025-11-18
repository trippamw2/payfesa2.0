import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSwipeable } from "react-swipeable";
import OptimizedImage from "@/components/OptimizedImage";
import heroImage from "@/assets/hero-savings.jpg";

const Hero = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Swipe handlers for better mobile interaction
  const handlers = useSwipeable({
    onSwipedDown: () => {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    },
    trackMouse: false,
    trackTouch: true,
  });

  return (
    <section 
      className="relative pt-24 pb-16 md:pt-40 md:pb-32 overflow-hidden"
      {...handlers}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-trust/5 to-accent/5" 
           style={{ transform: `translateY(${scrollY * 0.5}px)` }} />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="space-y-4 md:space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium">
              <span className="w-1.5 md:w-2 h-1.5 md:h-2 bg-primary rounded-full animate-pulse" />
              Malawi's Chipereganyu Smart App
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight pb-2 md:pb-4 pt-1 text-left">
              100% Payout Guaranteed
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent pb-2 mt-1 md:mt-2">
                Safe, Clear, Together
              </span>
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-charcoal leading-relaxed pt-1 md:pt-2 text-left max-w-2xl">
              Every payout is guaranteed. See all payments in real time. Pay on time to build your trust score and earn bonus money on every payout.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2 md:pt-4">
              <Button 
                asChild 
                size="lg" 
                className="bg-gradient-to-r from-primary to-wealth-dark hover:opacity-90 text-sm sm:text-base md:text-lg h-12 sm:h-12 md:h-14 px-5 sm:px-6 md:px-8 shadow-lg transition-all hover:scale-105 active:scale-95 touch-feedback min-h-[48px]"
              >
                <Link to="/auth">
                  Create Your Account
                  <ArrowRight className="ml-2 h-4 md:h-5 w-4 md:w-5" />
                </Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                variant="outline" 
                className="text-sm sm:text-base md:text-lg h-12 sm:h-12 md:h-14 px-5 sm:px-6 md:px-8 border-2 transition-all hover:scale-105 active:scale-95 touch-feedback min-h-[48px]"
              >
                <a href="https://www.youtube.com/@PayFesaMalawi" target="_blank" rel="noopener noreferrer">
                  <Play className="mr-2 h-4 md:h-5 w-4 md:w-5" />
                  See How It Works
                </a>
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 md:gap-8 pt-4 md:pt-8">
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary">98%</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-charcoal">Success Rate</div>
              </div>
              <div className="text-center border-l border-r border-border">
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary">250M+</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-charcoal">Money Saved</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary">15,000+</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-charcoal">Members</div>
              </div>
            </div>
          </div>
          
          <div className="relative animate-fade-in mt-8 lg:mt-0" style={{ animationDelay: "0.2s" }}>
            <div className="absolute -inset-4 bg-gradient-to-r from-primary to-trust rounded-3xl opacity-20 blur-3xl" 
                 style={{ transform: `translateY(${scrollY * 0.1}px)` }} />
            <OptimizedImage
              src={heroImage} 
              alt="People using PayFesa chipereganyu groups to save money together" 
              className="relative rounded-2xl md:rounded-3xl shadow-2xl w-full"
              loading="eager"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
              style={{ transform: `translateY(${scrollY * 0.05}px)` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
