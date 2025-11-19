import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const AIGroupHealthPanel = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-group-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_group_insights')
        .select('*, rosca_groups(name)')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    }
  });

  const analyzeGroupsMutation = useMutation({
    mutationFn: async (groupId?: string) => {
      const { data, error } = await supabase.functions.invoke('ai-group-health-analyzer', {
        body: { groupId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-group-insights'] });
      toast.success('Group health analysis complete');
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze groups');
    }
  });

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'warning': return 'warning';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'default';
      case 'medium': return 'warning';
      case 'high': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'good': return <TrendingUp className="h-4 w-4 text-primary" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'critical': return <TrendingDown className="h-4 w-4 text-destructive" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const excellentCount = insights?.filter(i => i.health_status === 'excellent').length || 0;
  const criticalCount = insights?.filter(i => i.health_status === 'critical').length || 0;
  const avgHealthScore = insights && insights.length > 0 
    ? insights.reduce((sum, i) => sum + Number(i.health_score), 0) / insights.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Group Health Insights</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered group performance analysis
          </p>
        </div>
        <Button
          onClick={() => analyzeGroupsMutation.mutate(undefined)}
          disabled={analyzeGroupsMutation.isPending}
        >
          <Activity className={`h-4 w-4 mr-2 ${analyzeGroupsMutation.isPending ? 'animate-pulse' : ''}`} />
          Analyze All Groups
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="font-medium">Excellent Groups</span>
          </div>
          <p className="text-3xl font-bold">{excellentCount}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-medium">Critical Groups</span>
          </div>
          <p className="text-3xl font-bold">{criticalCount}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-medium">Avg Health Score</span>
          </div>
          <p className="text-3xl font-bold">{avgHealthScore.toFixed(1)}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Group Health Status</h3>
        
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading insights...</p>
        ) : insights && insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div key={insight.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getHealthIcon(insight.health_status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{insight.rosca_groups?.name || 'Unknown Group'}</h4>
                        <Badge variant={getHealthColor(insight.health_status) as any}>
                          {insight.health_status}
                        </Badge>
                        <Badge variant={getRiskColor(insight.risk_level) as any}>
                          Risk: {insight.risk_level}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span>Health Score: {insight.health_score}%</span>
                        <span>•</span>
                        <span>{new Date(insight.created_at).toLocaleDateString()}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-2">
                        {insight.strengths && insight.strengths.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-success mb-1">Strengths:</h5>
                            <ul className="text-xs space-y-1">
                              {insight.strengths.slice(0, 2).map((strength, i) => (
                                <li key={i}>• {strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {insight.weaknesses && insight.weaknesses.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-destructive mb-1">Weaknesses:</h5>
                            <ul className="text-xs space-y-1">
                              {insight.weaknesses.slice(0, 2).map((weakness, i) => (
                                <li key={i}>• {weakness}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {insight.ai_recommendation && (
                        <div className="bg-primary/5 border border-primary/20 rounded p-2 text-xs">
                          <strong>AI Recommendation:</strong> {insight.ai_recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No group insights yet</p>
        )}
      </Card>
    </div>
  );
};