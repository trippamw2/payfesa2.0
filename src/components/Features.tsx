import { Shield, Zap, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import appFeaturesImage from "@/assets/app-features.jpg";
import OptimizedImage from "@/components/OptimizedImage";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Features = () => {
  const { ref, isVisible } = useScrollAnimation();
  
  const features = [
    {
      icon: Shield,
      title: "Your Payout is Protected",
      description: "When it is your turn, you get your money. No excuses. No delays. Fully protected.",
    },
    {
      icon: Zap,
      title: "Full Transparency",
      description: "See everything in real time. Who paid. Who missed. When your turn comes. No secrets. No confusion.",
    },
    {
      icon: Brain,
      title: "Save Together, Rise Together",
      description: "Build your trust score. Earn bonuses on every payout. Help your group succeed. When everyone wins, you win more.",
    },
  ];

  return (
    <section 
      ref={ref}
      className={`py-16 md:py-20 lg:py-32 bg-muted/30 transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto mb-12 md:mb-16 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-4 md:mb-6">
            Why Use PayFesa
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-charcoal leading-relaxed">
            Every member is protected. Every payment is visible. Every group rises together.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="space-y-4 md:space-y-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
                <CardContent className="p-4 md:p-6">
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-wealth-dark rounded-xl flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">{feature.title}</h3>
                      <p className="text-sm md:text-base text-charcoal leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="relative mt-8 lg:mt-0">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary to-trust rounded-3xl opacity-20 blur-3xl" />
            <OptimizedImage
              src={appFeaturesImage} 
              alt="PayFesa chipereganyu group features on mobile phone" 
              className="relative rounded-2xl md:rounded-3xl shadow-2xl w-full"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
