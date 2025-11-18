import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Check, CheckCheck, Users, Loader2, Pin, X, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { debounce } from 'lodash';

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender_id: string | null;
  message_type?: string;
  is_pinned?: boolean;
  metadata?: Record<string, any>;
  profiles?: {
    name: string;
    avatar_url?: string;
  };
  message_read_receipts?: Array<{
    user_id: string;
  }>;
}

interface TypingUser {
  user_id: string;
  full_name: string;
}

interface Props {
  groupId: string;
  currentUserId: string;
}

const ChatTab = ({ groupId, currentUserId }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkIfAdmin();
    fetchMessages();
    fetchMemberCount();
    subscribeToMessages();
    subscribeToPresence();
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkIfAdmin = async () => {
    const { data } = await supabase
      .from('rosca_groups')
      .select('creator_id')
      .eq('id', groupId)
      .single();
    
    setIsGroupAdmin(data?.creator_id === currentUserId);
  };

  const fetchMemberCount = async () => {
    try {
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);
      
      setMemberCount(count || 0);
    } catch (error) {
      console.error('Error fetching member count:', error);
    }
  };

  const fetchMessages = async () => {
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:sender_id (
          name,
          avatar_url
        ),
        message_read_receipts (
          user_id
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
      setIsLoading(false);
      return;
    }

    // Separate pinned and regular messages
    const pinned = messagesData?.filter(m => m.is_pinned) || [];
    const regular = messagesData?.filter(m => !m.is_pinned) || [];
    
    setPinnedMessages(pinned as any);
    setMessages(regular as any);
    setIsLoading(false);
    markMessagesAsRead();
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          
          // Handle pinned messages separately
          if (newMsg.is_pinned) {
            setPinnedMessages(prev => [...prev, newMsg]);
            return;
          }
          
          // Fetch sender profile for user messages
          if (newMsg.sender_id) {
            supabase
              .from('users')
              .select('name, avatar_url')
              .eq('id', newMsg.sender_id)
              .single()
              .then(({ data: profile }) => {
                setMessages(prev => [...prev, {
                  ...newMsg,
                  profiles: profile ? { name: profile.name, avatar_url: profile.avatar_url } : undefined
                }]);
                markMessagesAsRead();
              });
          } else {
            // System message
            setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          
          // Handle pin/unpin updates
          if (updatedMsg.is_pinned) {
            setMessages(prev => prev.filter(m => m.id !== updatedMsg.id));
            setPinnedMessages(prev => {
              const exists = prev.find(m => m.id === updatedMsg.id);
              return exists ? prev.map(m => m.id === updatedMsg.id ? updatedMsg : m) : [...prev, updatedMsg];
            });
          } else {
            setPinnedMessages(prev => prev.filter(m => m.id !== updatedMsg.id));
            setMessages(prev => {
              const exists = prev.find(m => m.id === updatedMsg.id);
              return exists ? prev.map(m => m.id === updatedMsg.id ? updatedMsg : m) : [...prev, updatedMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToPresence = () => {
    const channel = supabase.channel(`presence:${groupId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing = Object.values(state)
          .flat()
          .filter((p: any) => p.typing && p.user_id !== currentUserId)
          .map((p: any) => ({ user_id: p.user_id, full_name: p.full_name }));
        setTypingUsers(typing);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessagesAsRead = async () => {
    const unreadMessages = messages.filter(
      msg => msg.sender_id !== currentUserId && 
      !msg.message_read_receipts?.some(r => r.user_id === currentUserId)
    );

    for (const msg of unreadMessages) {
      await supabase
        .from('message_read_receipts')
        .insert({ message_id: msg.id, user_id: currentUserId })
        .select()
        .single();
    }
  };

  const broadcastTyping = useCallback(
    debounce((typing: boolean) => {
      const channel = supabase.channel(`presence:${groupId}`);
      channel.track({
        user_id: currentUserId,
        full_name: 'Current User',
        typing
      });
    }, 300),
    [groupId, currentUserId]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    broadcastTyping(true);
    
    setTimeout(() => {
      broadcastTyping(false);
    }, 1000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          sender_id: currentUserId,
          message: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
      broadcastTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const togglePinMessage = async (messageId: string, currentlyPinned: boolean) => {
    if (!isGroupAdmin) {
      toast.error('Only group admins can pin messages');
      return;
    }

    const { error } = await supabase
      .from('messages')
      .update({ 
        is_pinned: !currentlyPinned,
        pinned_by: currentlyPinned ? null : currentUserId,
        pinned_at: currentlyPinned ? null : new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update message');
    } else {
      toast.success(currentlyPinned ? 'Message unpinned' : 'Message pinned');
    }
  };

  const getMessageStatus = (msg: Message) => {
    const readCount = msg.message_read_receipts?.length || 0;
    
    if (readCount === 0) {
      return <Check className="h-3 w-3" />;
    } else if (readCount === memberCount - 1) {
      return <CheckCheck className="h-3 w-3 text-primary" />;
    } else {
      return <CheckCheck className="h-3 w-3" />;
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const grouped: Record<string, Message[]> = {};
    
    messages.forEach(msg => {
      const date = new Date(msg.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateKey: string;
      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else {
        dateKey = date.toLocaleDateString();
      }
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(msg);
    });
    
    return grouped;
  };

  const renderMessage = (msg: Message, isPinned = false) => {
    const isOwnMessage = msg.sender_id === currentUserId;
    const isSystemMessage = msg.message_type === 'system' || msg.message_type === 'announcement';

    if (isSystemMessage) {
      return (
        <div key={msg.id} className="flex justify-center my-4">
          <div className="max-w-[80%] bg-accent/20 border border-accent/30 rounded-lg p-3 text-center">
            <p className="text-sm text-accent-foreground font-medium">{msg.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''} group`}>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={msg.profiles?.avatar_url} />
          <AvatarFallback>{msg.profiles?.name?.[0] || '?'}</AvatarFallback>
        </Avatar>
        
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
          {!isOwnMessage && (
            <span className="text-xs text-muted-foreground mb-1 px-1">
              {msg.profiles?.name || 'Unknown'}
            </span>
          )}
          
          <div className="relative">
            <div className={`rounded-2xl px-4 py-2 ${
              isOwnMessage 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
            }`}>
              <p className="text-sm break-words">{msg.message}</p>
            </div>
            
            <div className="flex items-center gap-2 mt-1 px-1">
              <span className="text-xs text-muted-foreground">
                {new Date(msg.created_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              
              {isOwnMessage && getMessageStatus(msg)}
              
              {isGroupAdmin && !isPinned && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => togglePinMessage(msg.id, false)}
                >
                  <Pin className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[600px]">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Pinned messages */}
          {pinnedMessages.length > 0 && (
            <div className="bg-accent/10 border-b border-accent/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Pin className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-accent-foreground">Pinned Messages</span>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {pinnedMessages.map(msg => (
                  <div key={msg.id} className="bg-background rounded-lg p-2 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{msg.message}</p>
                      <span className="text-xs text-muted-foreground">
                        {msg.profiles?.name || 'System'}
                      </span>
                    </div>
                    {isGroupAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => togglePinMessage(msg.id, true)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages container */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-sm text-muted-foreground">Be the first to start the conversation!</p>
                </div>
              ) : (
                Object.entries(groupMessagesByDate(messages)).map(([dateKey, msgs]) => (
                  <div key={dateKey}>
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-muted px-3 py-1 rounded-full">
                        <span className="text-xs text-muted-foreground font-medium">{dateKey}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {msgs.map(msg => renderMessage(msg))}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              {typingUsers.map(u => u.full_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          {/* Message input */}
          <form onSubmit={sendMessage} className="p-4 border-t">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{memberCount} members</span>
              </div>
              <Input
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1"
                disabled={isSending}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!newMessage.trim() || isSending}
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatTab;
