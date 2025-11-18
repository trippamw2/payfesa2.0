import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

const TermsOfService = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h1 className="text-3xl md:text-5xl font-bold mb-6">
                Terms of Service
              </h1>
              <p className="text-lg text-charcoal leading-relaxed">
                Last updated: January 2025
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto space-y-8">
              <Card>
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Welcome to PayFesa</h2>
                    <p className="text-charcoal leading-relaxed">
                      These terms explain how PayFesa works and what you agree to when you use our service. By using PayFesa, you agree to follow these terms. Please read them carefully.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">What PayFesa Does</h2>
                    <p className="text-charcoal leading-relaxed">
                      PayFesa is a platform that helps you run chipereganyu groups online. We collect money from group members automatically. We send payouts to members when it is their turn. We keep track of all payments and group activity. We make chipereganyu easier and safer.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Your Account</h2>
                    <p className="text-charcoal leading-relaxed mb-3">
                      To use PayFesa, you must:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-charcoal leading-relaxed ml-4">
                      <li>Be at least 18 years old</li>
                      <li>Have a valid mobile money or bank account</li>
                      <li>Provide true and accurate information</li>
                      <li>Keep your password safe and private</li>
                      <li>Not share your account with others</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Fees and Payments</h2>
                    <p className="text-charcoal leading-relaxed mb-4">
                      PayFesa charges an 11% platform maintenance fee on each payout. This fee is deducted from your payout amount when you receive your money. For example, if your payout is MWK 100,000, you will receive MWK 89,000 and PayFesa keeps MWK 11,000 as the platform maintenance fee.
                    </p>
                    <p className="text-charcoal leading-relaxed">
                      This fee covers the technology that keeps your money safe, tracks all payments, sends automatic reminders, and processes transactions. There are no other hidden fees. You only pay when you receive your payout.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Your Responsibilities</h2>
                    <p className="text-charcoal leading-relaxed mb-3">
                      When you use PayFesa, you agree to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-charcoal leading-relaxed ml-4">
                      <li>Make your chipereganyu payments on time</li>
                      <li>Keep enough money in your mobile money or bank account</li>
                      <li>Join groups with people you know and trust</li>
                      <li>Follow the rules of your chipereganyu group</li>
                      <li>Not use PayFesa for illegal activities</li>
                      <li>Not try to cheat or trick other members</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Group Rules</h2>
                    <p className="text-charcoal leading-relaxed">
                      Each chipereganyu group sets its own rules about payment amounts, rotation order, and membership. PayFesa provides the technology, but group members are responsible for choosing who joins their group. Choose members you trust. PayFesa is not responsible for disputes between group members.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">What PayFesa Is Not Responsible For</h2>
                    <p className="text-charcoal leading-relaxed mb-3">
                      PayFesa is not responsible for:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-charcoal leading-relaxed ml-4">
                      <li>Problems with your mobile money or bank account</li>
                      <li>Disputes between group members</li>
                      <li>Members who do not pay on time</li>
                      <li>Technical problems with your phone or internet</li>
                      <li>Financial losses from your chipereganyu group</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Closing Your Account</h2>
                    <p className="text-charcoal leading-relaxed">
                      You can close your PayFesa account anytime. First, make sure you have fulfilled all your chipereganyu commitments. If you have already received your payout, you must complete paying into the group until everyone has had their turn. Contact us at support@payfesa.com to close your account.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Changes to These Terms</h2>
                    <p className="text-charcoal leading-relaxed">
                      We may update these terms from time to time. We will notify you of important changes. By continuing to use PayFesa after changes are made, you agree to the new terms.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                    <p className="text-charcoal leading-relaxed">
                      If you have questions about these terms, contact us at support@payfesa.com or WhatsApp +265 98 331 1818.
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

export default TermsOfService;
