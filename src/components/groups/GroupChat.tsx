import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface GroupChatProps {
  groupId: string;
  onBack: () => void;
}

const GroupChat = ({ groupId, onBack }: GroupChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [groupName, setGroupName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUser();
    fetchGroupDetails();
    fetchMessages();
    subscribeToMessages();
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchGroupDetails = async () => {
    const { data, error } = await supabase
      .from('rosca_groups')
      .select('name')
      .eq('id', groupId)
      .single();

    if (data) setGroupName(data.name);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Fetch profile names separately
    const messagesWithProfiles = await Promise.all(
      (data || []).map(async (msg: any) => {
        if (!msg.sender_id) return { ...msg, profiles: { full_name: 'System' } };
        
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', msg.sender_id)
          .single();

        return {
          ...msg,
          profiles: { full_name: profile?.name || 'Unknown' }
        };
      })
    );

    setMessages(messagesWithProfiles as any);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`group_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          setMessages(prev => [...prev, payload.new as any]);
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
    
    if (!newMessage.trim() || !user) return;

    try {
      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          message: newMessage.trim(),
          message_type: 'user'
        })
        .select('id')
        .single();

      if (error) throw error;

      // Note: send-chat-notifications function not implemented yet

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 bg-background border-b">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{groupName}</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[70%] p-3 ${
                  msg.user_id === user?.id
                    ? 'bg-primary text-white'
                    : 'bg-secondary'
                }`}
              >
                <p className="text-xs font-semibold mb-1 opacity-80">
                  {msg.profiles.full_name}
                </p>
                <p className="text-sm">{msg.message}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(msg.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </Card>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 bg-background border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" className="bg-primary text-white">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupChat;
