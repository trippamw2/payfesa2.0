import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export const AISystemMonitorPanel = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['ai-system-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_system_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    }
  });

  const runMonitoringMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-system-monitor', {
        body: {}
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-system-alerts'] });
      toast.success('System monitoring complete');
    },
    onError: (error) => {
      console.error('Monitor error:', error);
      toast.error('Failed to run system monitoring');
    }
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('ai_system_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-system-alerts'] });
      toast.success('Alert acknowledged');
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'warning';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const activeAlerts = alerts?.filter(a => a.status === 'active') || [];
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">System Monitoring</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered real-time system health monitoring
          </p>
        </div>
        <Button
          onClick={() => runMonitoringMutation.mutate()}
          disabled={runMonitoringMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${runMonitoringMutation.isPending ? 'animate-spin' : ''}`} />
          Run Monitoring
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <span className="font-medium">Critical Alerts</span>
          </div>
          <p className="text-3xl font-bold">{criticalCount}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            <span className="font-medium">Warnings</span>
          </div>
          <p className="text-3xl font-bold">{warningCount}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="font-medium">Total Active</span>
          </div>
          <p className="text-3xl font-bold">{activeAlerts.length}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Active Alerts</h3>
        
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading alerts...</p>
        ) : activeAlerts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No active alerts</p>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{alert.title}</h4>
                        <Badge variant={getSeverityColor(alert.severity) as any}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline">{alert.alert_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                      {alert.ai_recommendation && (
                        <div className="bg-primary/5 border border-primary/20 rounded p-3 text-sm">
                          <strong>AI Recommendation:</strong> {alert.ai_recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                    disabled={acknowledgeAlertMutation.isPending}
                  >
                    Acknowledge
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(alert.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};