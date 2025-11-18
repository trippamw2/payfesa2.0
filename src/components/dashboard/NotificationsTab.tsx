import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, MessageSquare, CheckCircle2, TrendingUp, Users, Clock, Settings, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import GroupMessaging from './GroupMessaging';
import { celebrateSmall } from '@/lib/confetti';
import { User, Notification } from '@/types';

interface Props {
  user: User;
}

const NotificationsTab = ({ user }: Props) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Set up realtime subscription (only for INSERT to avoid duplicate triggers)
      const channel = supabase
        .channel(`user-notifications-${user.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const notification = payload.new as Notification;
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            toast.info(notification.title);
            
            // Celebrate achievements
            if (notification.type === 'achievement') {
              setTimeout(() => {
                celebrateSmall();
              }, 300);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data || []) as any);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('user_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'contribution_success':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'payout_approved':
      case 'instant_payout_success':
        return <CheckCircle2 className="h-4 w-4 text-info" />;
      case 'payout_rejected':
        return <Clock className="h-4 w-4 text-destructive" />;
      case 'member_join':
        return <Users className="h-4 w-4 text-primary" />;
      case 'achievement':
        return <Trophy className="h-4 w-4 text-warning" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-3 space-y-2 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold">Notifications</h2>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px]"
          onClick={() => navigate('/notification-settings')}
        >
          <Settings className="h-3 w-3 mr-1" />
          Settings
        </Button>
      </div>
      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-2 h-8">
          <TabsTrigger value="alerts" className="flex items-center gap-1 text-[10px]">
            <Bell className="h-3 w-3" />
            Alerts
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-[8px] h-3 px-1">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1 text-[10px]">
            <MessageSquare className="h-3 w-3" />
            Messages
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="alerts" className="space-y-1.5 mt-2">
          {loading ? (
            <div className="space-y-1.5">
              {[1, 2].map(i => (
                <Card key={i} className="p-2">
                  <div className="animate-pulse flex gap-2">
                    <div className="h-8 w-8 bg-muted rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Card className="p-4">
              <div className="text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No notifications</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-1">
              {notifications.slice(0, 6).map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-2 cursor-pointer transition-all hover:shadow-sm ${
                    !notification.read ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    if (!notification.read) markAsRead(notification.id);
                  }}
                >
                  <div className="flex gap-2">
                    <div className={`p-1 rounded-full h-fit ${
                      !notification.read ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <h4 className="font-semibold text-[10px] leading-tight">{notification.title}</h4>
                        <span className="text-[8px] text-muted-foreground whitespace-nowrap">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[9px] text-muted-foreground line-clamp-2">{notification.message}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-2">
          <GroupMessaging user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsTab;
