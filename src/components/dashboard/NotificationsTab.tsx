import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Bell, MessageSquare, AlertCircle, Clock, CheckCircle, CheckCircle2, XCircle, BookOpen, Gift, Sparkles, PartyPopper, TrendingUp, Shield, Users, Trophy, Settings, Trash2 } from "lucide-react";
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
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Set up realtime subscription for new notifications
      const channel = supabase
        .channel(`user-notifications-${user.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const notification = payload.new as Notification;
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show toast with better formatting
            toast.success(notification.title, {
              description: notification.message,
              duration: 5000,
            });
            
            // Celebrate achievements and milestones
            if (notification.type === 'achievement' || notification.type === 'contribution_success') {
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
      toast.error('Failed to load notifications');
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
      toast.error('Failed to mark notification as read');
    }
  };

  const deleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.read ? Math.max(0, prev - 1) : prev;
      });
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'welcome':
        return <PartyPopper className="h-4 w-4 text-primary" />;
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
      case 'group_message':
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'reminder':
        return <Bell className="h-4 w-4 text-info animate-pulse" />;
      case 'education':
        return <BookOpen className="h-4 w-4 text-purple-500" />;
      case 'milestone':
        return <Gift className="h-4 w-4 text-success" />;
      case 'growth':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'trust':
        return <Shield className="h-4 w-4 text-green-600" />;
      case 'promotion':
        return <Gift className="h-4 w-4 text-success" />;
      case 'update':
        return <Sparkles className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate to Messages tab if it's a group message
    if (notification.type === 'group_message' && notification.metadata?.groupId) {
      const event = new CustomEvent('switch-to-messages', { 
        detail: { groupId: notification.metadata.groupId } 
      });
      window.dispatchEvent(event);
    } else {
      // Show full message in dialog for other notifications
      setSelectedNotification(notification);
      setIsDialogOpen(true);
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
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-2">
                    <div className={`p-1 rounded-full h-fit flex-shrink-0 ${
                      !notification.read ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <h4 className="font-semibold text-[10px] leading-tight">{notification.title}</h4>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-muted-foreground whitespace-nowrap">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => deleteNotification(notification.id, e)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                       <p className="text-[9px] text-muted-foreground line-clamp-2">{notification.message}</p>
                       <span className="text-[8px] text-primary mt-0.5 inline-block">Tap to read more</span>
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

      {/* Full Notification Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              {selectedNotification && getNotificationIcon(selectedNotification.type)}
              <DialogTitle className="text-base">{selectedNotification?.title}</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              {selectedNotification?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-muted-foreground">
            {selectedNotification && new Date(selectedNotification.created_at).toLocaleString()}
          </div>
          <Button onClick={() => setIsDialogOpen(false)} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationsTab;
