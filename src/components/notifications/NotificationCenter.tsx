import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, Trash2, Settings, DollarSign, Users, AlertCircle, TrendingUp, BookOpen, Gift, Sparkles, CheckCircle, XCircle, Clock, PartyPopper, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'payment' | 'group' | 'system' | 'achievement';
  read: boolean;
  created_at: string;
  data?: any;
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    subscribeToNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast.info(payload.new.title);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <DollarSign className="h-4 w-4 text-primary" />;
      case 'group':
        return <Users className="h-4 w-4 text-chart-2" />;
      case 'achievement':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'reminder':
        return <Bell className="h-4 w-4 text-info animate-pulse" />;
      case 'education':
        return <BookOpen className="h-4 w-4 text-purple-500" />;
      case 'promotion':
        return <Gift className="h-4 w-4 text-success" />;
      case 'update':
        return <Sparkles className="h-4 w-4 text-primary" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.data?.route) {
      navigate(notification.data.route);
    }
  };

  const filteredNotifications = (type?: string) => {
    if (!type) return notifications;
    return notifications.filter(n => n.type === type);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/notification-settings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-4 px-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="group">Groups</TabsTrigger>
            <TabsTrigger value="achievement">Rewards</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px]">
            <TabsContent value="all" className="m-0">
              <NotificationList
                notifications={notifications}
                onRead={markAsRead}
                onDelete={deleteNotification}
                onClick={handleNotificationClick}
                getIcon={getIcon}
              />
            </TabsContent>
            <TabsContent value="payment" className="m-0">
              <NotificationList
                notifications={filteredNotifications('payment')}
                onRead={markAsRead}
                onDelete={deleteNotification}
                onClick={handleNotificationClick}
                getIcon={getIcon}
              />
            </TabsContent>
            <TabsContent value="group" className="m-0">
              <NotificationList
                notifications={filteredNotifications('group')}
                onRead={markAsRead}
                onDelete={deleteNotification}
                onClick={handleNotificationClick}
                getIcon={getIcon}
              />
            </TabsContent>
            <TabsContent value="achievement" className="m-0">
              <NotificationList
                notifications={filteredNotifications('achievement')}
                onRead={markAsRead}
                onDelete={deleteNotification}
                onClick={handleNotificationClick}
                getIcon={getIcon}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationListProps {
  notifications: Notification[];
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: Notification) => void;
  getIcon: (type: string) => React.ReactNode;
}

function NotificationList({ notifications, onRead, onDelete, onClick, getIcon }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
        <p className="text-sm">No notifications</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
            !notification.read ? 'bg-primary/5' : ''
          }`}
          onClick={() => onClick(notification)}
        >
          <div className="flex gap-3">
            <div className="rounded-full bg-accent p-2 h-fit">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className={`font-medium text-sm ${!notification.read ? 'text-primary' : ''}`}>
                  {notification.title}
                </h4>
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {notification.message}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  className="h-6 px-2 text-xs"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
