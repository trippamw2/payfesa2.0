import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send, Image as ImageIcon, Loader2, Smile } from 'lucide-react';
import { toast } from 'sonner';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

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

interface GroupChatProps {
  groupId: string;
  onBack: () => void;
}

const GroupChat = ({ groupId, onBack }: GroupChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [groupName, setGroupName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
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

      // Send message with image
      await sendImageMessage(publicUrl);
      
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

  const sendImageMessage = async (imageUrl: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        group_id: groupId,
        sender_id: user.id,
        message: '📷 Image',
        image_url: imageUrl,
        message_type: 'user'
      });

    if (error) {
      console.error('Error sending image:', error);
      throw error;
    }
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
          const newMsg = payload.new as any;
          
          // Fetch sender profile for new message
          let profile = { full_name: 'System' };
          if (newMsg.sender_id) {
            const { data } = await supabase
              .from('users')
              .select('name')
              .eq('id', newMsg.sender_id)
              .single();
            
            profile = { full_name: data?.name || 'Unknown' };
          }
          
          setMessages(prev => [...prev, { ...newMsg, profiles: profile }]);
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

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          message: newMessage.trim(),
          message_type: 'user'
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            const isSystem = msg.message_type === 'system';
            const senderName = isSystem ? 'PayFesa' : msg.profiles.full_name;
            
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
                    {senderName}
                  </span>
                  <Card
                    className={`p-3 ${
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
                    <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </Card>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 bg-background border-t">
          <div className="flex gap-2 items-center relative">
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
              className="flex-shrink-0"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </Button>
            <div className="relative flex-1">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message... 💬"
                className="flex-1 pr-12"
                disabled={sending || uploading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              >
                <Smile className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              </Button>
              
              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 z-50">
                  <EmojiPicker 
                    onEmojiClick={handleEmojiClick}
                    width={320}
                    height={400}
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>
            <Button 
              type="submit" 
              size="icon"
              disabled={!newMessage.trim() || sending || uploading}
              className="flex-shrink-0"
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
    </div>
  );
};

export default GroupChat;
