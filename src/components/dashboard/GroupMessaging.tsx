import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@/types';

interface Message {
  id: string;
  user_id: string;
  message: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Fetch users separately
    const userIds = [...new Set(data?.map(m => m.sender_id) || [])];
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);

    // Merge user data with messages
    const messagesWithUsers = data?.map(msg => ({
      ...msg,
      user_id: msg.sender_id,
      profiles: { full_name: usersData?.find(u => u.id === msg.sender_id)?.name || 'Unknown' }
    }));

    setMessages((messagesWithUsers || []) as any);
  };

  const subscribeToMessages = () => {
    if (!selectedGroup) return;

    const channel = supabase
      .channel(`group_${selectedGroup.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${selectedGroup.id}`
        },
        async (payload) => {
          const { data: userProfile } = await supabase
            .from('users')
            .select('name')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage = {
            ...payload.new,
            user_id: payload.new.sender_id,
            profiles: { full_name: userProfile?.name || 'Unknown' }
          } as Message;

          setMessages(prev => [...prev, newMessage]);
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
    
    if (!newMessage.trim() || !selectedGroup) return;

    try {
      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert({
          group_id: selectedGroup.id,
          sender_id: user.id,
          message: newMessage.trim()
        })
        .select('id')
        .single();

      if (error) throw error;

      // Trigger batched notification system
      if (insertedMessage?.id) {
        supabase.functions.invoke('send-chat-notifications', {
          body: { message_id: insertedMessage.id }
        }).catch(err => console.error('Failed to trigger notification:', err));
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
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
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg p-2.5 ${
                  msg.user_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-[10px] font-medium mb-0.5 opacity-80">
                  {(msg.profiles as any)?.full_name || 'Unknown'}
                </p>
                <p className="text-sm break-words">{msg.message}</p>
                <p className="text-[10px] mt-1 opacity-70">
                  {new Date(msg.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-background border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-9 text-sm"
          />
          <Button type="submit" size="icon" className="h-9 w-9 bg-primary text-white">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default GroupMessaging;
