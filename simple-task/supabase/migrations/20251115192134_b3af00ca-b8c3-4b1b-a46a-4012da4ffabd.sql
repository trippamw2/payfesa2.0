-- Add RLS policies for achievements (users can't currently access their achievements!)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'achievements' AND policyname = 'Users can view their own achievements'
  ) THEN
    CREATE POLICY "Users can view their own achievements"
    ON public.achievements FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'achievements' AND policyname = 'System can insert achievements'
  ) THEN
    CREATE POLICY "System can insert achievements"
    ON public.achievements FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Add RLS policies for credit_scores
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'credit_scores' AND policyname = 'Users can view their own credit score'
  ) THEN
    CREATE POLICY "Users can view their own credit score"
    ON public.credit_scores FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'credit_scores' AND policyname = 'Admins can view all credit scores'
  ) THEN
    CREATE POLICY "Admins can view all credit scores"
    ON public.credit_scores FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'credit_scores' AND policyname = 'System can manage credit scores'
  ) THEN
    CREATE POLICY "System can manage credit scores"
    ON public.credit_scores FOR ALL
    USING (true);
  END IF;
END $$;

-- Add RLS policies for group_escrows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'group_escrows' AND policyname = 'Group members can view group escrow'
  ) THEN
    CREATE POLICY "Group members can view group escrow"
    ON public.group_escrows FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = group_escrows.group_id AND user_id = auth.uid()
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'group_escrows' AND policyname = 'System can manage escrows'
  ) THEN
    CREATE POLICY "System can manage escrows"
    ON public.group_escrows FOR ALL
    USING (true);
  END IF;
END $$;

-- Add RLS policies for admin tables
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Admins can view system settings'
  ) THEN
    CREATE POLICY "Admins can view system settings"
    ON public.system_settings FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Admins can manage system settings'
  ) THEN
    CREATE POLICY "Admins can manage system settings"
    ON public.system_settings FOR ALL
    USING (EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'performance_metrics' AND policyname = 'Admins can view performance metrics'
  ) THEN
    CREATE POLICY "Admins can view performance metrics"
    ON public.performance_metrics FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'revenue_settings' AND policyname = 'Admins can view revenue settings'
  ) THEN
    CREATE POLICY "Admins can view revenue settings"
    ON public.revenue_settings FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'revenue_settings' AND policyname = 'Admins can manage revenue settings'
  ) THEN
    CREATE POLICY "Admins can manage revenue settings"
    ON public.revenue_settings FOR ALL
    USING (EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_only_sensitive_users' AND policyname = 'Admins can manage sensitive user flags'
  ) THEN
    CREATE POLICY "Admins can manage sensitive user flags"
    ON public.admin_only_sensitive_users FOR ALL
    USING (EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ));
  END IF;
END $$;
