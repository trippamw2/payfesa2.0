-- Fix core application schemas - Part 2: RLS Policies and cleanup

-- ============================================
-- STEP 1: Enable RLS and add policies for new tables
-- ============================================

-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosca_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Rosca groups policies
DROP POLICY IF EXISTS "Anyone can view active groups" ON rosca_groups;
DROP POLICY IF EXISTS "Users can create groups" ON rosca_groups;
DROP POLICY IF EXISTS "Group creators can update groups" ON rosca_groups;

CREATE POLICY "Anyone can view active groups" ON rosca_groups FOR SELECT USING (status = 'active');
CREATE POLICY "Users can create groups" ON rosca_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creators can update groups" ON rosca_groups FOR UPDATE USING (auth.uid() = created_by);

-- User notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON user_notifications;

CREATE POLICY "Users can view own notifications" ON user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON user_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON user_notifications FOR INSERT WITH CHECK (true);

-- Typing indicators policies
DROP POLICY IF EXISTS "Group members can view typing indicators" ON typing_indicators;
DROP POLICY IF EXISTS "Users can manage own typing indicators" ON typing_indicators;

CREATE POLICY "Group members can view typing indicators" ON typing_indicators FOR SELECT 
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_id = typing_indicators.group_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage own typing indicators" ON typing_indicators FOR ALL 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Message read receipts policies
DROP POLICY IF EXISTS "Users can view read receipts for their messages" ON message_read_receipts;
DROP POLICY IF EXISTS "Users can insert own read receipts" ON message_read_receipts;

CREATE POLICY "Users can view read receipts for their messages" ON message_read_receipts FOR SELECT 
  USING (EXISTS (SELECT 1 FROM messages WHERE id = message_read_receipts.message_id AND sender_id = auth.uid()));
CREATE POLICY "Users can insert own read receipts" ON message_read_receipts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Trust scores policies
DROP POLICY IF EXISTS "Users can view all trust scores" ON trust_scores;
DROP POLICY IF EXISTS "System can manage trust scores" ON trust_scores;

CREATE POLICY "Users can view all trust scores" ON trust_scores FOR SELECT USING (true);
CREATE POLICY "System can manage trust scores" ON trust_scores FOR ALL USING (true) WITH CHECK (true);

-- Trust score history policies
DROP POLICY IF EXISTS "Users can view own trust score history" ON trust_score_history;

CREATE POLICY "Users can view own trust score history" ON trust_score_history FOR SELECT USING (auth.uid() = user_id);

-- Transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON transactions;

CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON transactions FOR INSERT WITH CHECK (true);

-- Users policies
DROP POLICY IF EXISTS "Users can view own user data" ON users;
DROP POLICY IF EXISTS "Users can update own user data" ON users;
DROP POLICY IF EXISTS "System can insert users" ON users;

CREATE POLICY "Users can view own user data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own user data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System can insert users" ON users FOR INSERT WITH CHECK (true);

-- ============================================
-- STEP 2: Enable RLS on admin tables
-- ============================================

ALTER TABLE admin_trust_credit_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_ussd_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rosca_groups_updated_at ON rosca_groups;
CREATE TRIGGER update_rosca_groups_updated_at BEFORE UPDATE ON rosca_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();