-- AI System Alerts table for monitoring
CREATE TABLE IF NOT EXISTS public.ai_system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR NOT NULL, -- 'api_error', 'payment_failure', 'payout_delay', 'spike_detected', 'system_warning'
  severity VARCHAR NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title VARCHAR NOT NULL,
  description TEXT,
  affected_entity_type VARCHAR, -- 'user', 'group', 'payout', 'transaction', 'system'
  affected_entity_id UUID,
  metrics JSONB, -- error counts, failure rates, etc.
  ai_recommendation TEXT,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES public.admin_users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_system_alerts_type ON public.ai_system_alerts(alert_type);
CREATE INDEX idx_ai_system_alerts_status ON public.ai_system_alerts(status);
CREATE INDEX idx_ai_system_alerts_severity ON public.ai_system_alerts(severity);
CREATE INDEX idx_ai_system_alerts_created ON public.ai_system_alerts(created_at DESC);

-- AI Generated Reports table
CREATE TABLE IF NOT EXISTS public.ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
  report_category VARCHAR NOT NULL, -- 'revenue', 'contributions', 'payouts', 'groups', 'users', 'system_health', 'fraud'
  title VARCHAR NOT NULL,
  summary TEXT,
  data JSONB NOT NULL, -- full report data
  insights JSONB, -- AI-generated insights
  recommendations JSONB, -- AI recommendations
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  generated_by VARCHAR DEFAULT 'ai',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_reports_type ON public.ai_reports(report_type);
CREATE INDEX idx_ai_reports_category ON public.ai_reports(report_category);
CREATE INDEX idx_ai_reports_period ON public.ai_reports(period_start, period_end);
CREATE INDEX idx_ai_reports_created ON public.ai_reports(created_at DESC);

-- AI Group Health Insights table
CREATE TABLE IF NOT EXISTS public.ai_group_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.rosca_groups(id) ON DELETE CASCADE,
  health_score DECIMAL(5,2) NOT NULL, -- 0-100
  health_status VARCHAR NOT NULL CHECK (health_status IN ('excellent', 'good', 'warning', 'critical')),
  risk_level VARCHAR NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  analysis JSONB NOT NULL, -- detailed analysis factors
  strengths TEXT[],
  weaknesses TEXT[],
  predictions JSONB, -- likely to collapse, likely to grow, etc.
  ai_recommendation TEXT,
  next_review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_group_insights_group ON public.ai_group_insights(group_id);
CREATE INDEX idx_ai_group_insights_status ON public.ai_group_insights(health_status);
CREATE INDEX idx_ai_group_insights_risk ON public.ai_group_insights(risk_level);
CREATE INDEX idx_ai_group_insights_score ON public.ai_group_insights(health_score DESC);

-- AI Support Suggestions table
CREATE TABLE IF NOT EXISTS public.ai_support_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID, -- if linked to a support ticket
  user_id UUID REFERENCES public.users(id),
  issue_type VARCHAR NOT NULL, -- 'payout_delay', 'contribution_missing', 'account_issue', 'group_problem'
  user_query TEXT NOT NULL,
  ai_analysis TEXT,
  suggested_answer TEXT NOT NULL,
  suggested_actions JSONB, -- actions to take
  confidence_score DECIMAL(5,2) NOT NULL, -- 0-100
  was_helpful BOOLEAN,
  admin_feedback TEXT,
  used_by UUID REFERENCES public.admin_users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_support_user ON public.ai_support_suggestions(user_id);
CREATE INDEX idx_ai_support_type ON public.ai_support_suggestions(issue_type);
CREATE INDEX idx_ai_support_confidence ON public.ai_support_suggestions(confidence_score DESC);
CREATE INDEX idx_ai_support_created ON public.ai_support_suggestions(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_group_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_support_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only access)
CREATE POLICY "Admins can view system alerts"
  ON public.ai_system_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update system alerts"
  ON public.ai_system_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view reports"
  ON public.ai_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view group insights"
  ON public.ai_group_insights FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view support suggestions"
  ON public.ai_support_suggestions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update support suggestions"
  ON public.ai_support_suggestions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_ai_system_alerts_updated_at
  BEFORE UPDATE ON public.ai_system_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_group_insights_updated_at
  BEFORE UPDATE ON public.ai_group_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();