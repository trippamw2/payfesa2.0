import { Card } from '@/components/ui/card';
import { Shield, Zap, Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function FeesSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Simple, Transparent Fees</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Payfesa uses an easy 12% fee. 6% goes to government fees (these are telco and bank charges, not Payfesa). 5% is Payfesa's service and protection fee. And 1% is saved to guarantee your payout. This keeps your money safe—always.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* 1% Payout Safety */}
          <Card className="p-8 text-center hover:shadow-xl transition-all border-2 hover:border-primary/50">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">1%</h3>
            <h4 className="font-semibold text-lg mb-3">Payout Safety</h4>
            <div className="space-y-3 text-left mb-6">
              <div>
                <p className="text-sm font-semibold text-primary">Problem:</p>
                <p className="text-sm text-muted-foreground">Someone pays late?</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Result:</p>
                <p className="text-sm text-muted-foreground">You still get paid on time</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Solution:</p>
                <p className="text-sm text-muted-foreground">Reserve fund covers late payments</p>
              </div>
            </div>
          </Card>

          {/* 5% Service */}
          <Card className="p-8 text-center hover:shadow-xl transition-all border-2 hover:border-primary/50 relative">
            <div className="absolute top-4 right-4">
              <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                Most Value
              </div>
            </div>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">5%</h3>
            <h4 className="font-semibold text-lg mb-3">Service & Protection</h4>
            <div className="space-y-3 text-left mb-6">
              <div>
                <p className="text-sm font-semibold text-primary">Problem:</p>
                <p className="text-sm text-muted-foreground">Platform needs to run 24/7</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Result:</p>
                <p className="text-sm text-muted-foreground">Fraud detection, notifications, support</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Solution:</p>
                <p className="text-sm text-muted-foreground">Keeps your money safe & accessible</p>
              </div>
            </div>
          </Card>

          {/* 6% Government */}
          <Card className="p-8 text-center hover:shadow-xl transition-all border-2 hover:border-primary/50">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">6%</h3>
            <h4 className="font-semibold text-lg mb-3">Government Fees</h4>
            <div className="space-y-3 text-left mb-6">
              <div>
                <p className="text-sm font-semibold text-primary">Problem:</p>
                <p className="text-sm text-muted-foreground">Mobile money has costs</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Result:</p>
                <p className="text-sm text-muted-foreground">We pay networks & banks</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Solution:</p>
                <p className="text-sm text-muted-foreground">
                  <strong>Not charged by PayFesa</strong> - goes to telecoms
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Example Calculation */}
        <Card className="p-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <h3 className="text-2xl font-bold mb-6 text-center">See How It Works</h3>
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">Gross Amount:</span>
              <span className="font-bold">MWK 100,000</span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>- Payout Safety (1%):</span>
              <span>MWK 1,000</span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>- Service (5%):</span>
              <span>MWK 5,000</span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>- Government (6%):</span>
              <span>MWK 6,000</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center text-xl font-bold">
              <span>You Receive:</span>
              <span className="text-primary">MWK 88,000</span>
            </div>
          </div>
        </Card>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link to="/auth">
            <Button size="lg" className="group">
              Start Saving with Confidence
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            No hidden fees. What you see is what you get.
          </p>
        </div>
      </div>
    </section>
  );
}
