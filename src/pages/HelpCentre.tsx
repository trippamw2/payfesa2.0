import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BookOpen, HelpCircle, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const HelpCentre = () => {
  const helpCategories = [
    {
      icon: BookOpen,
      title: "Getting Started",
      description: "Learn how to create your account and join your first chipereganyu group.",
      link: "/how-it-works",
    },
    {
      icon: HelpCircle,
      title: "Frequently Asked Questions",
      description: "Find answers to common questions about PayFesa and chipereganyu groups.",
      link: "/faq",
    },
    {
      icon: MessageCircle,
      title: "Contact Support",
      description: "Need more help? Our team is ready to answer your questions.",
      link: "/contact",
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
                Help Centre
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-charcoal leading-relaxed px-2">
                We are here to help you save money with your chipereganyu group. Find answers and support below.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
              {helpCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Link key={index} to={category.link}>
                    <Card className="h-full border-2 hover:border-primary/50 transition-all hover:shadow-lg">
                      <CardHeader>
                        <Icon className="w-12 h-12 text-primary mb-4" />
                        <CardTitle className="text-xl">{category.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-charcoal leading-relaxed">{category.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            <div className="max-w-3xl mx-auto mt-16">
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-8 text-center">
                  <h2 className="text-2xl font-bold mb-4">Still Need Help?</h2>
                  <p className="text-charcoal mb-6 leading-relaxed">
                    Our support team is ready to help you. Contact us anytime.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent">
                      <Link to="/contact">
                        <Mail className="w-5 h-5 mr-2" />
                        Contact Us
                      </Link>
                    </Button>
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

export default HelpCentre;
