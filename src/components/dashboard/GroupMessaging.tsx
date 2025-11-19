import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send, Users, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@/types';

interface Message {
  id: string;
  sender_id: string | null;
  message: string;
  image_url?: string;
  message_type: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface Group {
  id: string;
  name: string;
}

interface GroupMessagingProps {
  user: User;
}

const GroupMessaging = ({ user }: GroupMessagingProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserGroups();
  }, [user.id]);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [selectedGroup]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchUserGroups = async () => {
    const { data: memberGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    const groupIds = memberGroups?.map(m => m.group_id) || [];

    if (groupIds.length > 0) {
      const { data } = await supabase
        .from('rosca_groups')
        .select('id, name')
        .in('id', groupIds);

      setGroups(data || []);
    }
  };

  const fetchMessages = async () => {
    if (!selectedGroup) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', selectedGroup.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Fetch users separately (filter out null sender_ids)
    const userIds = [...new Set(data?.map(m => m.sender_id).filter(id => id !== null) || [])];
    const { data: usersData } = userIds.length > 0 ? await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds) : { data: [] };

    // Merge user data with messages
    const messagesWithUsers = data?.map(msg => ({
      ...msg,
      profiles: { 
        full_name: msg.sender_id 
          ? (usersData?.find(u => u.id === msg.sender_id)?.name || 'Unknown')
          : 'PayFesa'
      }
    }));

    setMessages((messagesWithUsers || []) as any);
  };

  const subscribeToMessages = () => {
    if (!selectedGroup) return;

    const channel = supabase
      .channel(`group_${selectedGroup.id}_messages`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${selectedGroup.id}`
        },
        async (payload) => {
          // Fetch user profile for sender_id (can be null for system messages)
          let userName = 'PayFesa';
          if (payload.new.sender_id) {
            const { data: userProfile } = await supabase
              .from('users')
              .select('name')
              .eq('id', payload.new.sender_id)
              .single();
            userName = userProfile?.name || 'Unknown';
          }

          const newMessage = {
            ...payload.new,
            profiles: { full_name: userName }
          };

          setMessages(prev => [...prev, newMessage as Message]);
          
          // Show toast for system messages
          if (payload.new.message_type === 'system' && payload.new.sender_id !== user.id) {
            toast.info(payload.new.message);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedGroup || sending) return;

    setSending(true);
    try {
      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert({
          group_id: selectedGroup.id,
          sender_id: user.id,
          message: newMessage.trim(),
          message_type: 'user'
        })
        .select('id')
        .single();

      if (error) throw error;

      // Get all group members except sender for notifications
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', selectedGroup.id)
        .neq('user_id', user.id);

      if (members && members.length > 0) {
        // Get sender name
        const { data: senderData } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        const senderName = senderData?.name || user.email?.split('@')[0] || 'Someone';

        // Create in-app notifications directly
        const notifications = members.map(member => ({
          user_id: member.user_id,
          type: 'group_message',
          title: selectedGroup.name,
          message: `${senderName}: ${newMessage.trim()}`,
          metadata: { 
            groupId: selectedGroup.id,
            messageId: insertedMessage.id,
            senderId: user.id,
            senderName
          }
        }));

        const { error: notifError } = await supabase
          .from('user_notifications')
          .insert(notifications);

        if (notifError) {
          console.error('Error creating notifications:', notifError);
        }
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: selectedGroup.id,
          sender_id: user.id,
          message: '📷 Image',
          image_url: publicUrl,
          message_type: 'user'
        });

      if (error) throw error;
      
      toast.success('Image sent!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!selectedGroup) {
    return (
      <div className="p-4 space-y-3 max-w-6xl mx-auto">
        <h3 className="text-sm font-semibold px-1">Select a Group to Chat</h3>
        {groups.length === 0 ? (
          <Card className="p-6 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">You're not in any groups yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setSelectedGroup(group)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{group.name}</h4>
                    <p className="text-xs text-muted-foreground">Tap to open chat</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-background border-b">
        <Button variant="ghost" size="icon" onClick={() => setSelectedGroup(null)} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="font-semibold text-sm">{selectedGroup.name}</h2>
          <p className="text-xs text-muted-foreground">Group Chat</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            const isSystem = msg.message_type === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="flex flex-col items-center gap-1 max-w-[80%]">
                    <span className="text-xs font-semibold text-primary">
                      PayFesa
                    </span>
                    <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg text-xs text-foreground text-center">
                      {msg.message}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <span className="text-xs font-medium text-muted-foreground px-2">
                    {msg.profiles.full_name}
                  </span>
                  <div
                    className={`rounded-lg p-2.5 ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.image_url && (
                      <img 
                        src={msg.image_url} 
                        alt="Shared image" 
                        className="rounded-lg max-w-full h-auto mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(msg.image_url, '_blank')}
                      />
                    )}
                    {msg.message && msg.message !== '📷 Image' && (
                      <p className="text-sm break-words">{msg.message}</p>
                    )}
                    <p className={`text-[10px] mt-1 ${isOwn ? 'opacity-70' : 'opacity-70'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-background border-t">
        <div className="flex gap-2 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-9 w-9"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-9 text-sm"
            disabled={sending || uploading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-9 w-9"
            disabled={!newMessage.trim() || sending || uploading}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default GroupMessaging;
