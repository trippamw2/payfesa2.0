import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, X, TrendingUp } from 'lucide-react';
import { AIAssistantChat } from './AIAssistantChat';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import logoIcon from '@/assets/payfesa-logo-icon.jpg';

interface AIAssistantButtonProps {
  userId: string;
}

export const AIAssistantButton = ({ userId }: AIAssistantButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button - Above mobile nav on small screens */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-[60%] md:bottom-4 md:top-auto md:right-8 h-12 w-12 rounded-full shadow-lg z-40 hover:scale-110 transition-transform p-0 overflow-hidden"
        size="icon"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {/* PayFesa Logo Background */}
          <img 
            src={logoIcon} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          {/* Chart Icon Overlay */}
          <div className="relative z-10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </Button>

      {/* Chat Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          <AIAssistantChat 
            userId={userId} 
            onClose={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};