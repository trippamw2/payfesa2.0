import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, TrendingUp, DollarSign, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';

export const AIReportsPanel = () => {
  const [reportType, setReportType] = useState('daily');
  const [category, setCategory] = useState('system_health');
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['ai-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    }
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-report-generator', {
        body: {
          reportType,
          category
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-reports'] });
      toast.success('Report generated successfully');
    },
    onError: (error) => {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report');
    }
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'revenue': return <DollarSign className="h-4 w-4" />;
      case 'contributions': return <TrendingUp className="h-4 w-4" />;
      case 'users': return <Users className="h-4 w-4" />;
      case 'fraud': return <Shield className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">AI-Generated Reports</h2>
          <p className="text-sm text-muted-foreground">
            Automated insights and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system_health">System Health</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="contributions">Contributions</SelectItem>
              <SelectItem value="payouts">Payouts</SelectItem>
              <SelectItem value="groups">Groups</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="fraud">Fraud</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">Loading reports...</p>
          </Card>
        ) : reports && reports.length > 0 ? (
          reports.map((report) => (
            <Card key={report.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  {getCategoryIcon(report.report_category)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{report.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{report.summary}</p>

                  {report.insights && Array.isArray(report.insights) && report.insights.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2">Key Insights:</h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        {report.insights.map((insight, i) => (
                          <li key={i}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.recommendations && Array.isArray(report.recommendations) && report.recommendations.length > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded p-3">
                      <h4 className="text-sm font-semibold mb-2">AI Recommendations:</h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        {report.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">No reports generated yet</p>
          </Card>
        )}
      </div>
    </div>
  );
};