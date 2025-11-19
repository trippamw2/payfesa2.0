import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const AISupportPanel = () => {
  const [userId, setUserId] = useState('');
  const [issueType, setIssueType] = useState('payout_delay');
  const [userQuery, setUserQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['ai-support-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_support_suggestions')
        .select('*, users(name, phone_number)')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    }
  });

  const generateSuggestionMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !userQuery) {
        throw new Error('User ID and query are required');
      }

      const { data, error } = await supabase.functions.invoke('ai-support-assistant', {
        body: {
          userId,
          issueType,
          userQuery
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-support-suggestions'] });
      toast.success('AI suggestion generated');
      setUserId('');
      setUserQuery('');
    },
    onError: (error) => {
      console.error('Support suggestion error:', error);
      toast.error('Failed to generate suggestion');
    }
  });

  const markHelpfulMutation = useMutation({
    mutationFn: async ({ id, helpful }: { id: string; helpful: boolean }) => {
      const { error } = await supabase
        .from('ai_support_suggestions')
        .update({ was_helpful: helpful })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-support-suggestions'] });
      toast.success('Feedback recorded');
    }
  });

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'warning';
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">AI Support Assistant</h2>
        <p className="text-sm text-muted-foreground">
          Get AI-powered support suggestions for user queries
        </p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Generate Support Suggestion</h3>
        <div className="grid gap-4">
          <Input
            placeholder="Enter User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <Select value={issueType} onValueChange={setIssueType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payout_delay">Payout Delay</SelectItem>
              <SelectItem value="contribution_missing">Contribution Missing</SelectItem>
              <SelectItem value="account_issue">Account Issue</SelectItem>
              <SelectItem value="group_problem">Group Problem</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Enter user's query or issue description"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
          <Button
            onClick={() => generateSuggestionMutation.mutate()}
            disabled={generateSuggestionMutation.isPending || !userId || !userQuery}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate AI Suggestion
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Support Suggestions</h3>
        
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading suggestions...</p>
        ) : suggestions && suggestions.length > 0 ? (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{suggestion.users?.name || 'Unknown User'}</span>
                        <Badge variant="outline">{suggestion.issue_type}</Badge>
                        <Badge variant={getConfidenceColor(Number(suggestion.confidence_score)) as any}>
                          {suggestion.confidence_score}% confident
                        </Badge>
                      </div>

                      <div className="mb-2">
                        <p className="text-sm font-medium mb-1">User Query:</p>
                        <p className="text-sm text-muted-foreground italic">"{suggestion.user_query}"</p>
                      </div>

                      {suggestion.ai_analysis && (
                        <div className="mb-2">
                          <p className="text-sm font-medium mb-1">AI Analysis:</p>
                          <p className="text-sm text-muted-foreground">{suggestion.ai_analysis}</p>
                        </div>
                      )}

                      <div className="bg-primary/5 border border-primary/20 rounded p-3 mb-2">
                        <p className="text-sm font-medium mb-1">Suggested Response:</p>
                        <p className="text-sm">{suggestion.suggested_answer}</p>
                      </div>

                      {suggestion.suggested_actions && Array.isArray(suggestion.suggested_actions) && (
                        <div className="text-xs text-muted-foreground">
                          <strong>Suggested Actions:</strong>{' '}
                          {suggestion.suggested_actions.map((a: any, i: number) => a.action).join(', ')}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markHelpfulMutation.mutate({ id: suggestion.id, helpful: true })}
                          disabled={suggestion.was_helpful !== null}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Helpful
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markHelpfulMutation.mutate({ id: suggestion.id, helpful: false })}
                          disabled={suggestion.was_helpful !== null}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          Not Helpful
                        </Button>
                        {suggestion.was_helpful !== null && (
                          <Badge variant={suggestion.was_helpful ? 'default' : 'secondary'}>
                            {suggestion.was_helpful ? 'Marked Helpful' : 'Marked Not Helpful'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(suggestion.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No support suggestions yet</p>
        )}
      </Card>
    </div>
  );
};