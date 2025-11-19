import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertTriangle, Award, RefreshCw } from 'lucide-react';
import { useAIInsights } from '@/hooks/useAIInsights';

interface AIInsightsPanelProps {
  userId: string;
}

export const AIInsightsPanel = ({ userId }: AIInsightsPanelProps) => {
  const { insights, isLoading, refreshInsights } = useAIInsights(userId);

  const getIcon = (type: string) => {
    switch (type) {
      case 'prediction':
        return <TrendingUp className="h-5 w-5 text-primary" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'celebration':
        return <Award className="h-5 w-5 text-success" />;
      default:
        return <Sparkles className="h-5 w-5 text-primary" />;
    }
  };

  const getVariant = (type: string) => {
    switch (type) {
      case 'warning':
        return 'destructive';
      case 'celebration':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (insights.length === 0 && !isLoading) return null;

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Insights</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshInsights}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-3">
        {insights.slice(0, 3).map((insight, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
          >
            {getIcon(insight.type)}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-1">
                <h4 className="font-medium text-sm">{insight.title}</h4>
                <Badge variant={getVariant(insight.type) as any} className="text-xs">
                  {insight.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{insight.message}</p>
            </div>
          </div>
        ))}
      </div>

      {insights.length > 3 && (
        <Button
          variant="link"
          size="sm"
          className="w-full mt-2"
          onClick={() => {
            // Switch to notifications tab
            window.dispatchEvent(
              new CustomEvent('switch-to-tab', { detail: { tab: 'notifications' } })
            );
          }}
        >
          View all {insights.length} insights
        </Button>
      )}
    </Card>
  );
};