import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Shield, Heart } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-12 md:py-20 lg:py-32 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-4 md:mb-6">
                <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-pulse" />
                Our Story
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-8 leading-tight px-2">
                Online Chipereganyu for
                <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Modern Malawi
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-charcoal font-medium mb-3 md:mb-4 leading-relaxed px-2">
                PayFesa helps Malawians save money together through digital chipereganyu groups. Traditional community savings made safe, easy, and automatic.
              </p>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                Daily, weekly, or monthly savings circles that work on your phone with mobile money and bank accounts.
              </p>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-12 md:py-20 lg:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <Card className="border-2">
              <CardContent className="p-4 sm:p-6 md:p-8 lg:p-12">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center">The Problem We Solve</h2>
                <div className="space-y-4 text-charcoal leading-relaxed text-lg">
                  <p>
                    For generations, Malawians have used <strong>chipereganyu</strong> to help each other save money. Friends, neighbors, and coworkers form groups where everyone contributes money regularly. Each period, one person receives the full amount. It continues until everyone gets their turn.
                  </p>
                  <p>
                    But traditional chipereganyu has problems:
                  </p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>People forget to pay or pay late</li>
                    <li>Money goes missing without clear records</li>
                    <li>Hard to track who paid and who didn't</li>
                    <li>Meeting in person every day, week, or month is difficult</li>
                    <li>Trust breaks when someone doesn't pay</li>
                    <li>No guarantee you'll get your money on time</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Solution Section */}
        <section className="py-12 md:py-20 lg:py-32 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <Card className="border-2 border-primary/20">
              <CardContent className="p-4 sm:p-6 md:p-8 lg:p-12">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center">Why Use PayFesa</h2>
                <div className="space-y-6">
                  <p className="text-charcoal leading-relaxed text-lg">
                    <strong>PayFesa brings chipereganyu to your phone.</strong> We keep the community spirit but solve the old problems with three simple promises:
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-6 mt-8">
                    <div className="flex flex-col gap-4">
                      <Shield className="w-10 h-10 text-primary flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-xl mb-2 text-primary">Your Payout is Protected</h3>
                        <p className="text-charcoal">Every payout is protected. When it is your turn, you get your money. No excuses. No delays.</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <Users className="w-10 h-10 text-primary flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-xl mb-2 text-primary">Full Transparency</h3>
                        <p className="text-charcoal">See everything in real time. Who paid. Who missed. When your turn comes. No secrets. No confusion. Everything is clear.</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <Heart className="w-10 h-10 text-primary flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-xl mb-2 text-primary">Save Together, Rise Together</h3>
                        <p className="text-charcoal">Build your trust score. Earn bonuses on every payout. Help your group succeed. When everyone wins, you win more.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Results Section */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">The Results</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center border-2">
                <CardContent className="p-6">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">98%</div>
                  <p className="text-charcoal">Groups complete successfully</p>
                </CardContent>
              </Card>
              <Card className="text-center border-2">
                <CardContent className="p-6">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">15,000+</div>
                  <p className="text-charcoal">Malawians saving together</p>
                </CardContent>
              </Card>
              <Card className="text-center border-2">
                <CardContent className="p-6">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">MWK 250M+</div>
                  <p className="text-charcoal">Saved through PayFesa</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Founder Story */}
        <section className="py-20 md:py-32 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-8 md:p-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-6">My Story with Chipereganyu</h2>
                <div className="space-y-4 text-charcoal leading-relaxed text-lg">
                  <p>
                    Growing up, I watched my parents use chipereganyu to achieve things that seemed impossible on a single income. They saved together with neighbors and friends, and that's how they paid my school fees, bought our first TV, and even started a small business.
                  </p>
                  <p>
                    When I started working, I joined my own chipereganyu group. Within months, I had saved enough to buy a laptop for my studies—something that would have taken me over a year saving alone. Then I used it again to furnish my first apartment. The discipline of contributing regularly, knowing my turn was coming, made achieving my goals feel easy and seamless.
                  </p>
                  <p>
                    But I also saw the challenges. Our group had arguments about late payments, and we lost trust when someone couldn't pay. That's when I realized: <strong>chipereganyu works, but it needs technology to reach its full potential.</strong>
                  </p>
                  <p className="text-xl font-semibold text-primary mt-6">
                    PayFesa is my way of giving every Malawian the same power that chipereganyu gave my family and me—but safer, easier, and more reliable than saving alone.
                  </p>
                  <p className="italic border-l-4 border-primary pl-4 mt-6">
                    "Chipereganyu helped me achieve my dreams faster than I ever could alone. Now I want to help every Malawian do the same."
                    <span className="block text-sm mt-2 not-italic">— Martin Kaponda, Founder</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <Card className="border-2">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-6">Our Mission</h2>
                <p className="text-xl text-charcoal leading-relaxed max-w-3xl mx-auto">
                  PayFesa exists to bring online chipereganyu to every Malawian. We make traditional community savings work for modern life - safe, automatic, and fair for everyone.
                </p>
                <p className="text-lg text-muted-foreground mt-4">
                  Join thousands of Malawians saving together through daily, weekly, and monthly chipereganyu groups.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
