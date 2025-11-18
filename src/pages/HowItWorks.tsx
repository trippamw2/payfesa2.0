import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserPlus, Wallet, CheckCircle } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: UserPlus,
      number: "1",
      title: "Sign Up Easy",
      description: "Create your account with your phone number. Connect your mobile money or bank account. Everything is done from your phone. No paperwork needed.",
    },
    {
      icon: Users,
      number: "2",
      title: "Create or Join a Group",
      description: "Start your own chipereganyu group and invite friends. Or join an existing group using their group code and inviter's name. Choose people you trust.",
    },
    {
      icon: Wallet,
      number: "3",
      title: "Save Together",
      description: "PayFesa takes money from your mobile money or bank account automatically each cycle. Everyone pays on time. No one forgets. No awkward reminders needed.",
    },
    {
      icon: CheckCircle,
      number: "4",
      title: "Get Paid Fast",
      description: "When it's your turn, money goes straight to your mobile money or bank account. No waiting for meetings. No delays. Get your full payout instantly.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <section className="py-12 md:py-20 lg:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-8 md:mb-16">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 px-2">
                How PayFesa Works
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-charcoal leading-relaxed px-2">
                Join a chipereganyu group in 4 easy steps. Every payout is guaranteed. Everything is transparent. Save together, rise together.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12 md:mb-20">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card key={index} className="relative border-2 hover:border-primary/50 transition-all hover:shadow-lg">
                    <CardContent className="p-4 md:p-6 pt-10 md:pt-12">
                      <div className="absolute -top-5 md:-top-6 left-4 md:left-6 w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center text-primary-foreground font-bold text-lg md:text-xl shadow-lg">
                        {step.number}
                      </div>
                      <Icon className="w-6 h-6 md:w-8 md:h-8 text-primary mb-3 md:mb-4" />
                      <h3 className="text-base md:text-xl font-bold mb-2 md:mb-3">{step.title}</h3>
                      <p className="text-sm md:text-base text-charcoal leading-relaxed">{step.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="max-w-4xl mx-auto">
              <Card className="border-2">
                <CardContent className="p-8">
                  <h2 className="text-2xl md:text-3xl font-bold mb-6">Two Ways to Join PayFesa</h2>
                  <p className="text-charcoal mb-8">Your money is safe. You see everything. Everyone wins together.</p>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-xl font-bold text-primary mb-4">Create Your Own Group</h3>
                      <ul className="space-y-3 text-charcoal">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <span>Set up your group in minutes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <span>Choose how much to save daily, weekly, or monthly</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <span>Invite your trusted friends and family</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <span>You control who joins your group</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-primary mb-4">Join an Existing Group</h3>
                      <ul className="space-y-3 text-charcoal">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <span>Get the group code from your friend</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <span>Enter the inviter's name to verify</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <span>Join groups with people you trust</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <span>Start saving right away</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorks;
