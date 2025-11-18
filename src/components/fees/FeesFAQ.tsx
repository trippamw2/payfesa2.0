import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Shield, Zap, Building2, CheckCircle } from 'lucide-react';

export function FeesFAQ() {
  return (
    <section id="fees-faq" className="py-16 px-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Transparent Fees, Guaranteed Protection</h2>
          <p className="text-muted-foreground text-lg">
            Simple, fair pricing. Your payout is always protected.
          </p>
        </div>

        {/* Fee Overview Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <Card className="p-6 text-center border-primary/20 hover:border-primary/40 transition-all">
            <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="font-bold text-xl mb-2">1% Payout Safety</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Your payout is protected even if someone pays late
            </p>
            <div className="text-primary font-semibold">Guaranteed Security</div>
          </Card>

          <Card className="p-6 text-center border-primary/20 hover:border-primary/40 transition-all">
            <Zap className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="font-bold text-xl mb-2">5% Service</h3>
            <p className="text-sm text-muted-foreground mb-3">
              24/7 fraud detection, notifications, and expert support
            </p>
            <div className="text-primary font-semibold">Premium Protection</div>
          </Card>

          <Card className="p-6 text-center border-primary/20 hover:border-primary/40 transition-all">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="font-bold text-xl mb-2">6% Government</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Mobile money, bank, and telecom fees (not charged by PayFesa)
            </p>
            <div className="text-primary font-semibold">Third-Party Costs</div>
          </Card>
        </div>

        {/* FAQ Accordion */}
        <Card className="p-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">
                Why do you charge 1% for payout safety?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <div className="space-y-2">
                  <p><strong>Problem:</strong> What if someone in your group pays late and your payout is delayed?</p>
                  <p><strong>Result:</strong> With payout safety, you still get your money on time.</p>
                  <p><strong>Solution:</strong> This 1% fee creates a protection fund that covers any late payments, ensuring your payout is never delayed.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                What does the 5% service fee cover?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <div className="space-y-2">
                  <p><strong>Problem:</strong> Running a secure savings platform requires constant monitoring and support.</p>
                  <p><strong>Result:</strong> You get 24/7 fraud detection, instant notifications, and expert support.</p>
                  <p><strong>Solution:</strong> This fee covers:</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Advanced fraud detection systems</li>
                    <li>Real-time transaction monitoring</li>
                    <li>Push notifications and SMS alerts</li>
                    <li>Customer support team</li>
                    <li>Platform maintenance and improvements</li>
                    <li>Data security and encryption</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">
                Why is there a 6% government fee?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <div className="space-y-2">
                  <p><strong>Problem:</strong> Mobile money and bank transfers aren't free.</p>
                  <p><strong>Result:</strong> PayFesa pays these fees to mobile networks and banks on your behalf.</p>
                  <p><strong>Solution:</strong> This 6% goes directly to:</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Airtel Money / TNM Mpamba transaction fees</li>
                    <li>Bank transfer charges</li>
                    <li>Telecom network fees</li>
                    <li>Government taxes on financial transactions</li>
                  </ul>
                  <p className="mt-2"><strong>Important:</strong> PayFesa doesn't profit from this 6% - it goes entirely to third parties.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                Is my payout really guaranteed?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <div className="space-y-2">
                  <p><strong>Yes, absolutely!</strong> Here's how we guarantee it:</p>
                  <ul className="list-none space-y-2 ml-0">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Escrow Protection:</strong> All contributions are held in secure escrow until payout time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Reserve Fund:</strong> The 1% safety fee creates a reserve that covers late payments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Automated Processing:</strong> Payouts happen automatically at 5 PM on your scheduled date</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Insurance Backed:</strong> Every payout is backed by our insurance fund</span>
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                How does PayFesa compare to traditional ROSCAs?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <div className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">Traditional ROSCA:</h4>
                      <ul className="list-disc ml-6 space-y-1 text-sm">
                        <li>No protection if someone doesn't pay</li>
                        <li>Manual tracking and collection</li>
                        <li>No fraud protection</li>
                        <li>Disputes hard to resolve</li>
                        <li>Cash handling risks</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">PayFesa:</h4>
                      <ul className="list-disc ml-6 space-y-1 text-sm">
                        <li>Guaranteed payouts (1% fee)</li>
                        <li>Automated, digital payments</li>
                        <li>24/7 fraud monitoring (5% fee)</li>
                        <li>Instant dispute resolution</li>
                        <li>Secure digital transactions (6% fee)</li>
                      </ul>
                    </div>
                  </div>
                  <p className="text-sm mt-4">
                    <strong>Bottom line:</strong> Yes, there's a 12% total fee, but you get guaranteed payouts, fraud protection, and peace of mind that traditional ROSCAs can't offer.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left">
                Can I see the fee breakdown before I contribute?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>
                  <strong>Absolutely!</strong> PayFesa is 100% transparent. Before you confirm any contribution or receive any payout, you'll see:
                </p>
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>Gross amount (total pool)</li>
                  <li>1% payout safety fee</li>
                  <li>5% service & protection fee</li>
                  <li>6% government & telecom fee</li>
                  <li>Net amount you'll receive</li>
                </ul>
                <p className="mt-2">
                  No hidden charges. What you see is what you get.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Trust Banner */}
        <div className="mt-12 text-center">
          <Card className="p-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <h3 className="text-2xl font-bold mb-4">Your Money is Safe With Us</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Over 10,000+ successful payouts, zero defaults. Our transparent fee structure ensures your savings group runs smoothly, safely, and predictably.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>Guaranteed Payouts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>24/7 Fraud Detection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>Expert Support</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
