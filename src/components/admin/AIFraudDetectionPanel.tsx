import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface FraudDetection {
  id: string;
  user_id: string;
  detection_type: string;
  risk_level: string;
  confidence_score: number;
  detected_patterns: string[];
  evidence: any;
  ai_analysis: string;
  status: string;
  created_at: string;
  users?: {
    name: string;
    phone_number: string;
  };
}

export const AIFraudDetectionPanel = () => {
  const [detections, setDetections] = useState<FraudDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');

  useEffect(() => {
    fetchDetections();
    
    // Subscribe to new detections
    const channel = supabase
      .channel('fraud-detections')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_fraud_detections'
      }, () => {
        fetchDetections();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const fetchDetections = async () => {
    try {
      let query = supabase
        .from('ai_fraud_detections')
        .select(`
          *,
          users:user_id (
            name,
            phone_number
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setDetections(data || []);
    } catch (error: any) {
      console.error('Error fetching detections:', error);
      toast.error('Failed to load fraud detections');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('ai_fraud_detections')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Status updated successfully');
      fetchDetections();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">🔍 AI Fraud Detection</h2>
        <div className="flex gap-2">
          {['all', 'pending', 'reviewing', 'confirmed', 'false_positive'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {detections.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-muted-foreground">No fraud detections found</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {detections.map((detection) => (
            <Card key={detection.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getRiskIcon(detection.risk_level)}
                      <h3 className="font-semibold">
                        {detection.users?.name || 'Unknown User'}
                      </h3>
                      <Badge variant={getRiskColor(detection.risk_level) as any}>
                        {detection.risk_level.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {detection.confidence_score.toFixed(0)}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {detection.users?.phone_number} • {detection.detection_type}
                    </p>
                  </div>
                  <Badge variant="outline">{detection.status}</Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-sm"><strong>AI Analysis:</strong></p>
                  <p className="text-sm text-muted-foreground">{detection.ai_analysis}</p>
                </div>

                {detection.detected_patterns && detection.detected_patterns.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium">Patterns:</span>
                    {detection.detected_patterns.map((pattern: string, idx: number) => (
                      <Badge key={idx} variant="secondary">{pattern}</Badge>
                    ))}
                  </div>
                )}

                {detection.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => updateStatus(detection.id, 'reviewing')}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateStatus(detection.id, 'confirmed')}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Confirm Fraud
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(detection.id, 'false_positive')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      False Positive
                    </Button>
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