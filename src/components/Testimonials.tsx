import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import testimonialsImage from "@/assets/testimonials-bg.jpg";
import OptimizedImage from "@/components/OptimizedImage";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Testimonials = () => {
  const { ref, isVisible } = useScrollAnimation();
  
  const testimonials = [
    {
      name: "Mary Banda",
      role: "Shop Owner, Lilongwe",
      content: "PayFesa protected my money. I saved MWK 500,000 with my group. I could see every payment. My payout was guaranteed. Now my shop is bigger.",
      achievement: "Saved MWK 500,000 in 8 months",
      initials: "M",
    },
    {
      name: "John Phiri",
      role: "Teacher, Blantyre",
      content: "I see everything in the app. Who paid, who missed, when it's my turn. Full transparency. No confusion. I bought my first car with my guaranteed payout.",
      achievement: "Bought his first car",
      initials: "J",
    },
    {
      name: "Anna Mponda",
      role: "Market Seller, Mzuzu",
      content: "My group is like family. We save together and support each other. PayFesa makes it safe and clear. Now I pay school fees with no worry.",
      achievement: "Saves MWK 50,000 every month",
      initials: "A",
    },
    {
      name: "Patrick Mwale",
      role: "Farmer, Kasungu",
      content: "My trust score is high. I get bonuses on every payout. PayFesa rewards people who pay on time. I used my bonus to buy more seeds for my farm.",
      achievement: "Earned MWK 25,000 in bonuses",
      initials: "P",
    },
  ];

  return (
    <section 
      ref={ref}
      className={`py-12 md:py-16 lg:py-24 relative overflow-hidden transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="absolute inset-0 opacity-5">
        <OptimizedImage
          src={testimonialsImage} 
          alt="Happy PayFesa chipereganyu members" 
          className="w-full h-full object-cover"
          sizes="100vw"
        />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mx-auto mb-8 md:mb-12 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
            We Save Together. We Rise Together.
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-charcoal leading-relaxed">
            Real stories from people saving money across Malawi
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-all hover:shadow-xl">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <Avatar className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-primary to-wealth-dark">
                    <AvatarFallback className="text-primary-foreground font-bold text-sm md:text-base">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-xs md:text-sm">{testimonial.name}</div>
                    <div className="text-[10px] md:text-xs text-charcoal">{testimonial.role}</div>
                  </div>
                </div>
                
                <p className="text-xs md:text-sm text-charcoal mb-3 md:mb-4 leading-relaxed">{testimonial.content}</p>
                
                <div className="text-[10px] md:text-xs text-primary font-semibold">
                  {testimonial.achievement}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-6 md:mt-8">
          <p className="text-sm md:text-base text-charcoal">
            Join our community. Your payout is guaranteed. Your future is protected.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
