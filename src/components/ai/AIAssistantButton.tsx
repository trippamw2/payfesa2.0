import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, X } from 'lucide-react';
import { AIAssistantChat } from './AIAssistantChat';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
        className="fixed right-4 bottom-20 md:bottom-6 md:right-6 h-10 w-10 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
        size="icon"
      >
        <Bot className="h-4 w-4" />
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