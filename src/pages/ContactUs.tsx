import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MessageCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const ContactUs = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <section className="py-12 md:py-20 lg:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-8 md:mb-16">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">
                Contact Us
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-charcoal leading-relaxed px-2">
                Have questions? We are here to help. Reach out to us and we will get back to you quickly.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
              <Card className="border-2 hover:border-primary/50 transition-all">
                <CardContent className="p-4 sm:p-6 md:p-8">
                  <Mail className="w-10 h-10 md:w-12 md:h-12 text-primary mb-3 md:mb-4" />
                  <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">Email Us</h3>
                  <p className="text-charcoal mb-4 leading-relaxed">
                    Send us an email and we will respond within 24 hours.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <a href="mailto:support@payfesa.com" className="flex items-center justify-center gap-2">
                      support@payfesa.com
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all">
                <CardContent className="p-4 sm:p-6 md:p-8">
                  <MessageCircle className="w-10 h-10 md:w-12 md:h-12 text-primary mb-3 md:mb-4" />
                  <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">WhatsApp Us</h3>
                  <p className="text-charcoal mb-4 leading-relaxed">
                    Message us on WhatsApp for quick help and answers.
                  </p>
                  <Button asChild className="w-full bg-gradient-to-r from-primary to-accent">
                    <a 
                      href="https://wa.me/265983311818" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5" />
                      +265 98 331 1818
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="max-w-2xl mx-auto mt-12">
              <Card className="border-2">
                <CardContent className="p-8">
                  <MapPin className="w-12 h-12 text-primary mb-4 mx-auto" />
                  <h3 className="text-2xl font-bold mb-3 text-center">Our Location</h3>
                  <p className="text-charcoal text-center leading-relaxed">
                    PayFesa operates in Malawi, helping communities save money together through online chipereganyu groups.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="max-w-3xl mx-auto mt-16">
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-4 text-center">Office Hours</h2>
                  <div className="text-center text-charcoal leading-relaxed">
                    <p className="mb-2">Monday to Friday: 8:00 AM to 5:00 PM</p>
                    <p className="mb-2">Saturday: 9:00 AM to 1:00 PM</p>
                    <p>Sunday: Closed</p>
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

export default ContactUs;
