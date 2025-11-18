import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h1 className="text-3xl md:text-5xl font-bold mb-6">
                Privacy Policy
              </h1>
              <p className="text-lg text-charcoal leading-relaxed">
                Last updated: January 2025
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto space-y-8">
              <Card>
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Your Privacy Matters</h2>
                    <p className="text-charcoal leading-relaxed">
                      At PayFesa, we respect your privacy. This policy explains what information we collect, how we use it, and how we keep it safe. We only collect information needed to run PayFesa and help you save money with your chipereganyu group.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
                    <p className="text-charcoal leading-relaxed mb-3">
                      When you use PayFesa, we collect:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-charcoal leading-relaxed ml-4">
                      <li>Your name and phone number</li>
                      <li>Your mobile money or bank account details</li>
                      <li>Information about your chipereganyu groups</li>
                      <li>Payment and transaction history</li>
                      <li>How you use the PayFesa app</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
                    <p className="text-charcoal leading-relaxed mb-3">
                      We use your information to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-charcoal leading-relaxed ml-4">
                      <li>Process your chipereganyu payments</li>
                      <li>Send money to your mobile money or bank account</li>
                      <li>Keep your account safe and secure</li>
                      <li>Send you updates about your groups</li>
                      <li>Help you when you have problems</li>
                      <li>Make PayFesa better and easier to use</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Sharing Your Information</h2>
                    <p className="text-charcoal leading-relaxed">
                      We do not sell your information to anyone. We only share your information with mobile money and banking services to process payments. We share information with your chipereganyu group members so everyone can see group activity. We may share information if required by law.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Keeping Your Information Safe</h2>
                    <p className="text-charcoal leading-relaxed">
                      We use modern security technology to protect your information. Your data is encrypted and stored safely. Only authorized PayFesa staff can access your information. We regularly check our security to make sure your information stays safe.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
                    <p className="text-charcoal leading-relaxed mb-3">
                      You have the right to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-charcoal leading-relaxed ml-4">
                      <li>See what information we have about you</li>
                      <li>Ask us to correct wrong information</li>
                      <li>Ask us to delete your information</li>
                      <li>Stop receiving marketing messages</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                    <p className="text-charcoal leading-relaxed">
                      If you have questions about this privacy policy or your information, contact us at support@payfesa.com or WhatsApp +265 98 331 1818.
                    </p>
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

export default PrivacyPolicy;
