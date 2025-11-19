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
        className="fixed bottom-6 right-6 md:bottom-6 md:right-6 bottom-20 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
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