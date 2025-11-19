import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import { Home, Users, Wallet, Bell, User as UserIcon } from 'lucide-react';
import MyGroupsTab from '@/components/dashboard/MyGroupsTab';
import WalletTab from '@/components/dashboard/WalletTab';
import NotificationsTab from '@/components/dashboard/NotificationsTab';
import ProfileTab from '@/components/dashboard/ProfileTab';
import { toast } from 'sonner';


const DashboardTabs = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('groups');
  const [alertsCount, setAlertsCount] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);

  // Listen for switch to messages tab from notifications
  useEffect(() => {
    const handleSwitchToMessages = ((event: CustomEvent) => {
      setActiveTab('groups'); // Switch to groups tab which contains messaging
      // You could add additional logic here to open specific group
    }) as EventListener;

    const handleSwitchToTab = ((event: CustomEvent<{ tab: string }>) => {
      if (event.detail?.tab) {
        setActiveTab(event.detail.tab);
      }
    }) as EventListener;

    window.addEventListener('switch-to-messages', handleSwitchToMessages);
    window.addEventListener('switch-to-tab', handleSwitchToTab);
    return () => {
      window.removeEventListener('switch-to-messages', handleSwitchToMessages);
      window.removeEventListener('switch-to-tab', handleSwitchToTab);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const initializeUser = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          navigate('/auth');
          return;
        }
        
        if (!session) {
          navigate('/auth');
          return;
        }
        
        if (!mounted) return;
        setUser(session.user);
        
        // Fetch profile with simple retry (max 3 attempts)
        let attempts = 0;
        let profileData = null;
        
        while (attempts < 3 && !profileData && mounted) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (data) {
            profileData = data;
            break;
          }
          
          if (error && error.code !== 'PGRST116') { // Ignore "not found" errors
            console.error('Error fetching profile:', error);
          }
          
          attempts++;
          if (attempts < 3 && !profileData) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
          }
        }
        
        if (!mounted) return;
        
        if (profileData) {
          setProfile(profileData);
        } else {
          // Profile not found after retries - show error to user
          toast.error('Unable to load profile. Please try refreshing the page.');
          console.error('Profile not found after 3 attempts');
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        if (mounted) {
          toast.error('Failed to load user data');
        }
      }
    };

    // Set up real-time profile updates
    const setupRealtimeSubscription = () => {
      if (!user?.id) return;
      
      const channel = supabase
        .channel(`profile-updates-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            if (mounted) {
              setProfile(payload.new);
            }
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    };

    initializeUser();
    const cleanupRealtime = setupRealtimeSubscription();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/auth');
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        initializeUser();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (cleanupRealtime) cleanupRealtime();
    };
  }, [navigate]);

  // Fetch notification counts
  useEffect(() => {
    if (!user?.id) return;

    const fetchCounts = async () => {
      // Fetch unread alerts count
      const { count: alertsUnread } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setAlertsCount(alertsUnread || 0);

      // Fetch unread messages count from all groups
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (userGroups && userGroups.length > 0) {
        const groupIds = userGroups.map(g => g.group_id);
        
        // Get messages from user's groups that are unread
        const { data: messages } = await supabase
          .from('messages')
          .select('id, created_at, sender_id')
          .in('group_id', groupIds)
          .order('created_at', { ascending: false });

        // Count messages sent by others that are newer than user's last read
        const unreadMessages = messages?.filter(m => m.sender_id !== user.id) || [];
        setMessagesCount(unreadMessages.length > 0 ? Math.min(unreadMessages.length, 9) : 0);
      }
    };

    fetchCounts();

    // Subscribe to real-time updates for alerts
    const alertsChannel = supabase
      .channel(`alerts-count-${user.id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
        () => fetchCounts()
      )
      .subscribe();

    // Subscribe to real-time updates for messages
    const messagesChannel = supabase
      .channel(`messages-count-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user]);

  // Show loading state while fetching user
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't show error - just keep loading to avoid "page not found" flash
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Greeting - Only on groups tab */}
      {activeTab === 'groups' && (
        <div className="px-3 pt-2 pb-1">
          <h1 className="text-base font-bold">Hi, {profile.name?.split(' ')[0] || 'User'}! 👋</h1>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsContent value="groups" className="mt-0 h-full">
          <MyGroupsTab user={user} profile={profile} />
        </TabsContent>
        
        <TabsContent value="wallet" className="mt-0 h-full">
          <WalletTab user={user} />
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-0 h-full">
          <NotificationsTab user={user} />
        </TabsContent>
        
        <TabsContent value="profile" className="mt-0 h-full">
          <ProfileTab user={user} profile={profile} />
        </TabsContent>

        {/* Compact Bottom Tab */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t z-50">
          <TabsList className="grid w-full grid-cols-4 h-14 rounded-none bg-transparent">
            <TabsTrigger 
              value="groups" 
              className="flex flex-col gap-0.5 data-[state=active]:text-primary"
            >
              <Users className="h-4 w-4" />
              <span className="text-[9px]">Groups</span>
            </TabsTrigger>
            <TabsTrigger 
              value="wallet" 
              className="flex flex-col gap-0.5 data-[state=active]:text-primary"
            >
              <Wallet className="h-4 w-4" />
              <span className="text-[9px]">Wallet</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="flex flex-col gap-0.5 data-[state=active]:text-primary relative"
            >
              <div className="relative">
                <Bell className="h-4 w-4" />
                {alertsCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1.5 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[8px]">
                    {alertsCount > 9 ? '9+' : alertsCount}
                  </Badge>
                )}
              </div>
              <span className="text-[9px]">Alerts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="flex flex-col gap-0.5 data-[state=active]:text-primary"
            >
              <UserIcon className="h-4 w-4" />
              <span className="text-[9px]">Profile</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
};

export default DashboardTabs;
