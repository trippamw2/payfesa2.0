import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
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
              className="flex flex-col gap-0.5 data-[state=active]:text-primary"
            >
              <Bell className="h-4 w-4" />
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
