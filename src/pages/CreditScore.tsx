import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Award, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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
  const { goBack } = useBackNavigation();
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
    if (score >= 750) return 'text-green-500';
    if (score >= 650) return 'text-blue-500';
    if (score >= 550) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreRating = (score: number) => {
    if (score >= 750) return 'Excellent';
    if (score >= 650) return 'Good';
    if (score >= 550) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Header */}
      <div className="mb-6 bg-gradient-to-r from-primary to-secondary text-white p-6 rounded-lg">
        <Button
          variant="ghost"
          onClick={goBack}
          className="mb-4 text-white hover:bg-white/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-full">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Credit Score</h1>
            <p className="text-sm opacity-90">Your financial health rating</p>
          </div>
        </div>
      </div>

      {loading ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Loading credit score...</p>
        </Card>
      ) : creditScore ? (
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
                <span className={`font-semibold ${creditScore.late_payments > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {creditScore.late_payments}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`font-semibold ${creditScore.flagged_fraud ? 'text-red-500' : 'text-green-500'}`}>
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
      ) : (
        <Card className="p-8 text-center">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Credit Score Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start contributing to groups to build your credit score
          </p>
          <Button onClick={() => navigate('/groups')}>
            Browse Groups
          </Button>
        </Card>
      )}
    </div>
  );
};

export default CreditScore;
