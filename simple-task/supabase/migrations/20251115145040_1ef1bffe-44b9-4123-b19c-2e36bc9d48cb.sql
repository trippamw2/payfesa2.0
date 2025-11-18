-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for contributions table
ALTER TABLE public.contributions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contributions;

-- Enable realtime for rosca_groups table
ALTER TABLE public.rosca_groups REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rosca_groups;

-- Enable realtime for group_members table
ALTER TABLE public.group_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;

-- Enable realtime for mobile_money_transactions table (correct name with underscore)
ALTER TABLE public.mobile_money_transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mobile_money_transactions;

-- Enable realtime for payouts table
ALTER TABLE public.payouts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payouts;

-- Enable realtime for trust_scores table
ALTER TABLE public.trust_scores REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trust_scores;