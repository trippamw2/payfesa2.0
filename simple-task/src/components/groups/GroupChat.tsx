import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  image_url?: string | null;
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
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
      .select(`
        id,
        sender_id,
        message,
        created_at,
        image_url,
        profiles:users!messages_sender_id_fkey(name)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    const messagesWithProfiles = (data || []).map((msg: any) => ({
      ...msg,
      profiles: { 
        full_name: msg.sender_id ? (msg.profiles?.name || 'Unknown') : 'System'
      }
    }));

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
          const newMsg = payload.new as any;
          
          // Fetch sender profile if exists
          let profileName = 'System';
          if (newMsg.sender_id) {
            const { data: profile } = await supabase
              .from('users')
              .select('name')
              .eq('id', newMsg.sender_id)
              .single();
            profileName = profile?.name || 'Unknown';
          }
          
          setMessages(prev => [...prev, {
            ...newMsg,
            profiles: { full_name: profileName }
          }]);
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setSelectedImage(file);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `group-images/${groupId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('group-chat-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('group-chat-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && !selectedImage) || !user) return;

    try {
      setUploadingImage(true);
      let imageUrl: string | null = null;

      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl) {
          setUploadingImage(false);
          return;
        }
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          message: newMessage.trim() || (imageUrl ? 'Shared an image' : ''),
          message_type: 'user',
          image_url: imageUrl
        })
        .select('id')
        .single();

      if (error) throw error;

      setNewMessage('');
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setUploadingImage(false);
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
              className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[70%] p-3 ${
                  msg.sender_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                }`}
              >
                <p className="text-xs font-semibold mb-1 opacity-80">
                  {msg.profiles.full_name}
                </p>
                {msg.image_url && (
                  <img 
                    src={msg.image_url} 
                    alt="Shared image" 
                    className="rounded-lg mb-2 max-w-full h-auto"
                  />
                )}
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
          {selectedImage && (
            <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between">
              <span className="text-sm truncate">{selectedImage.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedImage(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Remove
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={uploadingImage}
            />
            <Button 
              type="submit" 
              disabled={(!newMessage.trim() && !selectedImage) || uploadingImage}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupChat;
