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
      {/* Floating Action Button - Visible on all screen sizes */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-4 md:right-8 md:bottom-8 h-14 w-14 rounded-full shadow-xl z-50 hover:scale-110 transition-all duration-300 p-0 overflow-hidden animate-pulse hover:animate-none"
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