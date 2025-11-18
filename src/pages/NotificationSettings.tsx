import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PageLayout } from "@/components/layout/PageLayout";
import { LoadingSkeleton } from "@/components/loading/LoadingSkeleton";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  metadata: any;
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications' }, loadNotifications)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
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
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      setNotifications([]);
      toast({
        title: "Notifications Cleared",
        description: "All notifications have been deleted",
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast({
        title: "Error",
        description: "Failed to clear notifications",
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setNotifications(notifications.filter((n) => n.id !== id));
      toast({
        title: "Notification Deleted",
        description: "The notification has been removed",
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "contribution_reminder":
        return "💰";
      case "payout_success":
        return "✅";
      case "group_invite":
        return "👥";
      case "trust_score_update":
        return "⭐";
      default:
        return "🔔";
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 pb-20">
      <Button
        variant="ghost"
        size="sm"
        onClick={goBack}
        className="mb-3 h-7"
      >
        <ArrowLeft className="mr-1.5 h-3 w-3" />
        <span className="text-xs">Back</span>
      </Button>

      <h1 className="text-lg font-bold mb-1">Notifications</h1>
      <p className="text-[10px] text-muted-foreground mb-4">Your notification history</p>

      <div className="space-y-3">
        <Card>
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold">History</h2>
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[9px] px-2"
                  onClick={clearAllNotifications}
                >
                  <Trash2 className="mr-1 h-2.5 w-2.5" />
                  Clear
                </Button>
              )}
            </div>
            {loading ? (
              <div className="text-center py-4">
                <p className="text-[10px] text-muted-foreground">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-6">
                <BellOff className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5 text-[10px]">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5 mb-0.5">
                        <h4 className="font-medium text-[10px]">{notification.title}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 flex-shrink-0"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-2.5 w-2.5 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-[9px] text-muted-foreground mb-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
                        <Badge variant={notification.read ? "secondary" : "default"} className="text-[7px] h-3 px-1">
                          {notification.read ? "Read" : "New"}
                        </Badge>
                        <span>•</span>
                        <span>{format(new Date(notification.created_at), 'MMM d, h:mma')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
