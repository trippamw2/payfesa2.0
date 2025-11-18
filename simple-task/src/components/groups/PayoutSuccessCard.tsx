import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, PartyPopper, TrendingUp } from 'lucide-react';
import { celebratePayout } from '@/lib/confetti';

interface Props {
  amount: number;
  cycleNumber: number;
  payoutDate: string;
  onClose?: () => void;
}

const PayoutSuccessCard = ({ amount, cycleNumber, payoutDate, onClose }: Props) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger celebration
    celebratePayout();
    
    // Animate card entrance
    setTimeout(() => setShow(true), 100);
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}>
      <Card className={`max-w-md mx-4 p-6 space-y-6 transform transition-all duration-500 ${show ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Success Icon */}
        <div className="relative">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-scale-in">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 animate-bounce">
            <PartyPopper className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="absolute -bottom-2 -left-2 animate-pulse">
            <Sparkles className="h-6 w-6 text-blue-500" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Congratulations! 🎉
          </h2>
          <p className="text-muted-foreground">Your payout is ready!</p>
        </div>

        {/* Amount */}
        <div className="p-6 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-green-700">Payout Amount</p>
          </div>
          <p className="text-4xl font-bold text-center text-green-700">
            MWK {amount.toLocaleString()}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cycle</span>
            <Badge variant="outline" className="font-semibold">#{cycleNumber}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payout Date</span>
            <span className="font-medium">{new Date(payoutDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Success Message */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-700 text-center">
            💰 Your funds will be sent to your mobile money or bank account shortly
          </p>
        </div>

        {/* Close Button */}
        {onClose && (
          <Button 
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
            size="lg"
          >
            Amazing! Continue
          </Button>
        )}
      </Card>
    </div>
  );
};

export default PayoutSuccessCard;
