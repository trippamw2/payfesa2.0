import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { TrendingUp, Award, Calendar, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { EmptyState } from '@/components/common/EmptyState';

interface CreditScore {
  base_score: number;
  trust_score: number;
  total_groups_joined: number;
  total_cycles_completed: number;
  late_payments: number;
  flagged_fraud: boolean;
  last_update: string;
}

const CreditScore = () => {
  const navigate = useNavigate();
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreditScore();
  }, []);

  const fetchCreditScore = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('credit_scores')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setCreditScore(data);
    } catch (error) {
      console.error('Error fetching credit score:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 750) return 'text-primary';
    if (score >= 650) return 'text-primary';
    if (score >= 550) return 'text-accent';
    return 'text-destructive';
  };

  const getScoreRating = (score: number) => {
    if (score >= 750) return 'Excellent';
    if (score >= 650) return 'Good';
    if (score >= 550) return 'Fair';
    return 'Poor';
  };

  return (
    <PageLayout
      title="Credit Score"
      subtitle="Your financial health rating"
      icon={<TrendingUp className="h-4 w-4" />}
    >
      {loading ? (
        <LoadingSkeleton variant="full" />
      ) : !creditScore ? (
        <EmptyState
          icon={<AlertCircle className="h-8 w-8 text-muted-foreground" />}
          title="No Credit Score Yet"
          description="Your credit score will appear here once you've made contributions and completed cycles."
          action={{
            label: "Join a Group",
            onClick: () => navigate('/groups')
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Main Score Card */}
          <Card className="p-6">
            <div className="text-center mb-6">
              <div className={`text-6xl font-bold mb-2 ${getScoreColor(creditScore.base_score)}`}>
                {creditScore.base_score}
              </div>
              <div className="text-lg font-semibold text-muted-foreground">
                {getScoreRating(creditScore.base_score)}
              </div>
              <Progress value={(creditScore.base_score / 900) * 100} className="mt-4" />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{creditScore.trust_score}</div>
                <div className="text-sm text-muted-foreground">Trust Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">{creditScore.total_cycles_completed}</div>
                <div className="text-sm text-muted-foreground">Cycles Completed</div>
              </div>
            </div>
          </Card>

          {/* Details Card */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Credit History
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Groups Joined</span>
                <span className="font-semibold">{creditScore.total_groups_joined}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Late Payments</span>
                <span className={`font-semibold ${creditScore.late_payments > 0 ? 'text-destructive' : 'text-primary'}`}>
                  {creditScore.late_payments}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`font-semibold ${creditScore.flagged_fraud ? 'text-destructive' : 'text-primary'}`}>
                  {creditScore.flagged_fraud ? 'Flagged' : 'Good Standing'}
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Last Updated
                </span>
                <span className="text-sm font-medium">
                  {new Date(creditScore.last_update).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>

          {/* Tips Card */}
          <Card className="p-6 bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-3">How to Improve Your Score</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Make all contributions on time</li>
              <li>✓ Complete full group cycles</li>
              <li>✓ Join and participate in multiple groups</li>
              <li>✓ Maintain a positive trust score</li>
              <li>✓ Avoid late payments and missed contributions</li>
            </ul>
          </Card>
        </div>
      )}
    </PageLayout>
  );
};

export default CreditScore;
