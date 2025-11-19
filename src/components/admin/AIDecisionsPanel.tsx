import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, AlertCircle, Bot } from 'lucide-react';
import { toast } from 'sonner';

interface AIDecision {
  id: string;
  decision_type: string;
  entity_type: string;
  entity_id: string;
  ai_decision: string;
  confidence_score: number;
  reasoning: string;
  risk_assessment: any;
  status: string;
  auto_executed: boolean;
  created_at: string;
}

export const AIDecisionsPanel = () => {
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchDecisions();
    
    // Subscribe to new decisions
    const channel = supabase
      .channel('ai-decisions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_decisions'
      }, () => {
        fetchDecisions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDecisions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_decisions')
        .select('*')
        .in('status', ['pending', 'auto_approved'])
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setDecisions(data || []);
    } catch (error: any) {
      console.error('Error fetching decisions:', error);
      toast.error('Failed to load AI decisions');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decisionId: string, action: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('ai-auto-decision', {
        body: {
          decisionId,
          adminId: user.id,
          action,
          notes: notes[decisionId] || ''
        }
      });

      if (error) throw error;
      
      toast.success(`Decision ${action}d successfully`);
      fetchDecisions();
      setNotes({ ...notes, [decisionId]: '' });
    } catch (error: any) {
      console.error('Error handling decision:', error);
      toast.error('Failed to process decision');
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'approve': return 'default';
      case 'reject': return 'destructive';
      case 'review_required': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">🤖 AI Auto Decisions</h2>
      </div>

      {decisions.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-muted-foreground">No pending AI decisions</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {decisions.map((decision) => (
            <Card key={decision.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold capitalize">
                        {decision.decision_type.replace('_', ' ')}
                      </h3>
                      <Badge variant={getDecisionColor(decision.ai_decision) as any}>
                        AI: {decision.ai_decision}
                      </Badge>
                      <Badge variant="outline">
                        {decision.confidence_score.toFixed(0)}% confident
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {decision.entity_type} • {new Date(decision.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={decision.status === 'auto_approved' ? 'secondary' : 'default'}>
                    {decision.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-sm"><strong>AI Reasoning:</strong></p>
                  <p className="text-sm text-muted-foreground">{decision.reasoning}</p>
                </div>

                {decision.risk_assessment && (
                  <div className="p-3 bg-muted/50 rounded-md space-y-2">
                    <p className="text-sm font-medium">Risk Assessment:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Risk Score:</span>
                        <span className="ml-2 font-medium">
                          {decision.risk_assessment.risk_score}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Risk Level:</span>
                        <span className="ml-2 font-medium capitalize">
                          {decision.risk_assessment.risk_level}
                        </span>
                      </div>
                    </div>
                    {decision.risk_assessment.risk_factors && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {decision.risk_assessment.risk_factors.map((factor: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {decision.status === 'pending' && (
                  <div className="space-y-3 pt-4 border-t">
                    <Textarea
                      placeholder="Add notes for this decision..."
                      value={notes[decision.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [decision.id]: e.target.value })}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleDecision(decision.id, 'approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve AI Decision
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDecision(decision.id, 'reject')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject AI Decision
                      </Button>
                    </div>
                  </div>
                )}

                {decision.auto_executed && (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-md">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-green-500">
                      Auto-executed (confidence {">"} 95%)
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};