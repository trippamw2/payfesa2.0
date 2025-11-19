import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, User, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface RiskScore {
  id: string;
  entity_type: string;
  entity_id: string;
  risk_score: number;
  risk_category: string;
  risk_factors: string[];
  ai_recommendation: string;
  confidence_level: string;
  created_at: string;
}

export const AIRiskScoresPanel = () => {
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchRiskScores();
  }, [filter]);

  const fetchRiskScores = async () => {
    try {
      let query = supabase
        .from('ai_risk_scores')
        .select('*')
        .order('risk_score', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('entity_type', filter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setScores(data || []);
    } catch (error: any) {
      console.error('Error fetching risk scores:', error);
      toast.error('Failed to load risk scores');
    } finally {
      setLoading(false);
    }
  };

  const analyzeEntity = async (entityType: string, entityId: string) => {
    try {
      toast.loading('Analyzing with AI...');
      
      const { data, error } = await supabase.functions.invoke('ai-fraud-analyzer', {
        body: {
          userId: entityId,
          entityType,
          entityId
        }
      });

      if (error) throw error;
      
      toast.success('AI analysis complete!');
      fetchRiskScores();
    } catch (error: any) {
      console.error('Error analyzing:', error);
      toast.error('Failed to analyze entity');
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="h-4 w-4" />;
      case 'group': return <Users className="h-4 w-4" />;
      case 'payout': return <DollarSign className="h-4 w-4" />;
      case 'contribution': return <TrendingUp className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-24 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">📊 AI Risk Scores</h2>
        <div className="flex gap-2">
          {['all', 'user', 'group', 'payout', 'contribution'].map((type) => (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['user', 'group', 'payout', 'contribution'].map((type) => {
          const typeScores = scores.filter(s => s.entity_type === type);
          const avgScore = typeScores.length > 0
            ? typeScores.reduce((sum, s) => sum + Number(s.risk_score), 0) / typeScores.length
            : 0;
          const highRisk = typeScores.filter(s => Number(s.risk_score) >= 70).length;

          return (
            <Card key={type} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {getEntityIcon(type)}
                <h3 className="font-semibold capitalize">{type}s</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${getRiskColor(avgScore)}`}>
                    {avgScore.toFixed(0)}
                  </span>
                  <span className="text-sm text-muted-foreground">avg risk</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {highRisk} high-risk {type}(s)
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Risk Score List */}
      <div className="grid gap-4">
        {scores.slice(0, 20).map((score) => (
          <Card key={score.id} className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    {getEntityIcon(score.entity_type)}
                    <h3 className="font-semibold capitalize">{score.entity_type}</h3>
                    <Badge variant="outline">{score.risk_category}</Badge>
                    <Badge variant="secondary">{score.confidence_level} confidence</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {score.entity_id.slice(0, 8)}...
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${getRiskColor(Number(score.risk_score))}`}>
                    {Number(score.risk_score).toFixed(0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Risk Score</p>
                </div>
              </div>

              <div>
                <Progress value={Number(score.risk_score)} className="h-2" />
              </div>

              {score.ai_recommendation && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">AI Recommendation:</p>
                  <p className="text-sm text-muted-foreground">{score.ai_recommendation}</p>
                </div>
              )}

              {score.risk_factors && score.risk_factors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium">Risk Factors:</span>
                  {score.risk_factors.map((factor: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{factor}</Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => analyzeEntity(score.entity_type, score.entity_id)}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Re-analyze
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};