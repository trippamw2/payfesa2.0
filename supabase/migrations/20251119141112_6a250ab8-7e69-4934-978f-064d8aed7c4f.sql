-- Create AI fraud detections table
CREATE TABLE IF NOT EXISTS public.ai_fraud_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  detection_type VARCHAR NOT NULL, -- 'behavior', 'payout', 'contribution', 'device', 'location'
  risk_level VARCHAR NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  detected_patterns JSONB DEFAULT '[]'::jsonb,
  evidence JSONB DEFAULT '{}'::jsonb,
  ai_analysis TEXT,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'confirmed', 'false_positive', 'resolved')),
  reviewed_by UUID REFERENCES public.admin_users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI risk scores table
CREATE TABLE IF NOT EXISTS public.ai_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR NOT NULL, -- 'user', 'group', 'payout', 'contribution'
  entity_id UUID NOT NULL,
  risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_category VARCHAR NOT NULL CHECK (risk_category IN ('fraud', 'default', 'compliance', 'financial')),
  risk_factors JSONB DEFAULT '[]'::jsonb,
  ai_recommendation TEXT,
  confidence_level VARCHAR CHECK (confidence_level IN ('low', 'medium', 'high')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI decisions table
CREATE TABLE IF NOT EXISTS public.ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type VARCHAR NOT NULL, -- 'payout_approval', 'account_freeze', 'contribution_review', 'group_suspend'
  entity_type VARCHAR NOT NULL,
  entity_id UUID NOT NULL,
  ai_decision VARCHAR NOT NULL CHECK (ai_decision IN ('approve', 'reject', 'review_required')),
  confidence_score DECIMAL(5,2) NOT NULL,
  reasoning TEXT,
  risk_assessment JSONB,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'auto_approved', 'admin_approved', 'admin_rejected', 'executed')),
  auto_executed BOOLEAN DEFAULT FALSE,
  admin_id UUID REFERENCES public.admin_users(id),
  admin_action VARCHAR CHECK (admin_action IN ('approved', 'rejected', 'modified')),
  admin_notes TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI fraud patterns table
CREATE TABLE IF NOT EXISTS public.ai_fraud_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name VARCHAR NOT NULL,
  pattern_type VARCHAR NOT NULL,
  description TEXT,
  detection_criteria JSONB NOT NULL,
  severity VARCHAR CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN DEFAULT TRUE,
  detection_count INTEGER DEFAULT 0,
  last_detected_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_fraud_detections_user ON public.ai_fraud_detections(user_id);
CREATE INDEX idx_fraud_detections_status ON public.ai_fraud_detections(status);
CREATE INDEX idx_fraud_detections_risk ON public.ai_fraud_detections(risk_level);
CREATE INDEX idx_risk_scores_entity ON public.ai_risk_scores(entity_type, entity_id);
CREATE INDEX idx_risk_scores_score ON public.ai_risk_scores(risk_score DESC);
CREATE INDEX idx_ai_decisions_status ON public.ai_decisions(status);
CREATE INDEX idx_ai_decisions_entity ON public.ai_decisions(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.ai_fraud_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_fraud_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_fraud_detections
CREATE POLICY "Admins can view all fraud detections"
  ON public.ai_fraud_detections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update fraud detections"
  ON public.ai_fraud_detections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert fraud detections"
  ON public.ai_fraud_detections FOR INSERT
  WITH CHECK (true);

-- RLS Policies for ai_risk_scores
CREATE POLICY "Admins can view all risk scores"
  ON public.ai_risk_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can manage risk scores"
  ON public.ai_risk_scores FOR ALL
  USING (true);

-- RLS Policies for ai_decisions
CREATE POLICY "Admins can view all AI decisions"
  ON public.ai_decisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update AI decisions"
  ON public.ai_decisions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert AI decisions"
  ON public.ai_decisions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for ai_fraud_patterns
CREATE POLICY "Admins can manage fraud patterns"
  ON public.ai_fraud_patterns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_ai_fraud_detections_updated_at
  BEFORE UPDATE ON public.ai_fraud_detections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_risk_scores_updated_at
  BEFORE UPDATE ON public.ai_risk_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_decisions_updated_at
  BEFORE UPDATE ON public.ai_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_fraud_patterns_updated_at
  BEFORE UPDATE ON public.ai_fraud_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default fraud patterns
INSERT INTO public.ai_fraud_patterns (pattern_name, pattern_type, description, detection_criteria, severity) VALUES
('Multiple Failed Logins', 'behavior', 'User has multiple failed login attempts in short time', '{"max_attempts": 5, "time_window_minutes": 30}'::jsonb, 'medium'),
('Rapid Withdrawals', 'financial', 'Multiple large withdrawals in quick succession', '{"min_count": 3, "time_window_hours": 24, "min_amount": 10000}'::jsonb, 'high'),
('Device Fingerprint Mismatch', 'device', 'New device used for high-value transaction', '{"transaction_threshold": 5000}'::jsonb, 'medium'),
('Unusual Location', 'location', 'Transaction from unusual or high-risk location', '{"distance_threshold_km": 500}'::jsonb, 'medium'),
('Contribution Pattern Anomaly', 'contribution', 'Unusual contribution patterns detected', '{"deviation_threshold": 2.5}'::jsonb, 'medium');