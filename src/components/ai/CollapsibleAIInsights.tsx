import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleAIInsightsProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export const CollapsibleAIInsights = ({ 
  title = "AI Insights",
  icon,
  children, 
  defaultExpanded = false,
  className 
}: CollapsibleAIInsightsProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className={cn(
      "mb-4 overflow-hidden transition-all duration-200",
      className
    )}>
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {icon || <Sparkles className="h-4 w-4 text-primary" />}
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </Card>
  );
};
