import { Card, CardContent } from "@/components/ui/card";

const HowItWorks = () => {
  const steps = [
    {
      number: "1",
      title: "Sign Up Safe",
      description: "Create your account with your phone. Connect your mobile money or bank account. Join the safest chipereganyu platform in Malawi. Protected from day one.",
    },
    {
      number: "2",
      title: "Join Your Community",
      description: "Start your own group or join using a code. Build your saving circle with people who support each other. Save together, rise together.",
    },
    {
      number: "3",
      title: "See Everything Clear",
      description: "Watch contributions in real time. Check who paid and who missed. Know when it's your turn. Full transparency. No confusion. No drama.",
    },
    {
      number: "4",
      title: "Get Your Payout Fast",
      description: "When it's your turn, money goes to your mobile money or bank account. Safe. Fast. Protected.",
    },
  ];

  return (
    <section className="py-12 md:py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 text-left">
            How It Works
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-charcoal leading-relaxed text-left">
            Start saving safely in 4 simple steps
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="relative border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="p-4 md:p-6 pt-10 md:pt-12">
                <div className="absolute -top-5 md:-top-6 left-4 md:left-6 w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-wealth-dark rounded-xl flex items-center justify-center text-primary-foreground font-bold text-lg md:text-xl shadow-lg">
                  {step.number}
                </div>
                <h3 className="text-base md:text-lg font-bold mb-2 md:mb-3">{step.title}</h3>
                <p className="text-xs md:text-sm text-charcoal leading-relaxed">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
