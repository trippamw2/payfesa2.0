import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Stats = () => {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <section 
      ref={ref}
      className={`py-12 md:py-16 bg-gradient-to-r from-primary to-wealth-dark text-primary-foreground transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-4 md:mb-6">
            Trusted. Protected. Growing Together.
          </h2>
          <p className="text-base md:text-lg lg:text-xl opacity-90 leading-relaxed">
            Join thousands who save with PayFesa. Every payout is protected. Everything is visible. Everyone wins together.
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 md:gap-8">
          <div className="text-center">
            <div className="text-2xl md:text-4xl lg:text-5xl font-bold mb-1 md:mb-2">250M+</div>
            <div className="text-sm md:text-base lg:text-lg opacity-90">Money Saved</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl md:text-4xl lg:text-5xl font-bold mb-1 md:mb-2">15,000+</div>
            <div className="text-sm md:text-base lg:text-lg opacity-90">Happy Members</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl md:text-4xl lg:text-5xl font-bold mb-1 md:mb-2">98%</div>
            <div className="text-sm md:text-base lg:text-lg opacity-90">Success Rate</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Stats;
