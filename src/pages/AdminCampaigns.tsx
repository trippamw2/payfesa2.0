import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Send, Calendar, Users, Target } from 'lucide-react';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  name: string;
  message: string;
  audience: string;
  status: string;
  priority: string;
  created_at: string;
  scheduled_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
}

const AdminCampaigns = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    audience: 'all',
    priority: 'medium',
    scheduled_at: '',
  });

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/admin/login');
      return;
    }

    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      const adminSession = sessionStorage.getItem('admin_session');
      if (adminSession) {
        try {
          const session = JSON.parse(adminSession);
          const ageOk = Date.now() - session.timestamp < 24 * 60 * 60 * 1000;
          if (ageOk) {
            fetchCampaigns();
            return;
          }
        } catch {}
      }
      toast.error('Admin access required');
      navigate('/admin/login');
      return;
    }

    fetchCampaigns();
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      if (!formData.name || !formData.message) {
        toast.error('Please fill in all required fields');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication required');
        return;
      }

      // Get admin_user ID from admin_users table
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const { error } = await supabase
        .from('notifications')
        .insert({
          name: formData.name,
          message: formData.message,
          audience: formData.audience,
          priority: formData.priority,
          status: formData.scheduled_at ? 'scheduled' : 'draft',
          scheduled_at: formData.scheduled_at || null,
          created_by: adminUser?.id || null,
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast.success('Campaign created successfully');
      setIsDialogOpen(false);
      setFormData({
        name: '',
        message: '',
        audience: 'all',
        priority: 'medium',
        scheduled_at: '',
      });
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      // Get target users based on audience
      let userIds: string[] = [];
      
      if (campaign.audience === 'all') {
        const { data: users } = await supabase
          .from('users')
          .select('id');
        userIds = users?.map(u => u.id) || [];
      } else if (campaign.audience === 'active') {
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .eq('frozen', false);
        userIds = users?.map(u => u.id) || [];
      }

      // Send notifications
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: userIds,
          title: campaign.name,
          body: campaign.message,
          data: {
            type: 'campaign',
            campaign_id: campaignId,
          },
        },
      });

      if (error) throw error;

      // Update campaign status
      await supabase
        .from('notifications')
        .update({
          status: 'sent',
          sent_count: userIds.length,
          total_recipients: userIds.length,
        })
        .eq('id', campaignId);

      toast.success('Campaign sent successfully');
      fetchCampaigns();
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Failed to send campaign');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'sent': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Campaign Management</h1>
              <p className="text-muted-foreground">Create and manage marketing campaigns</p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new marketing campaign to engage users
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Welcome Campaign"
                  />
                </div>
                
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Write your campaign message..."
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="audience">Audience</Label>
                    <Select value={formData.audience} onValueChange={(value) => setFormData({ ...formData, audience: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="active">Active Users</SelectItem>
                        <SelectItem value="inactive">Inactive Users</SelectItem>
                        <SelectItem value="premium">Premium Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="scheduled_at">Schedule (Optional)</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  />
                </div>
                
                <Button onClick={handleCreateCampaign} className="w-full">
                  Create Campaign
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{campaign.name}</CardTitle>
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                      <Badge variant="outline">{campaign.priority} priority</Badge>
                    </div>
                    <CardDescription>{campaign.message}</CardDescription>
                  </div>
                  
                  {campaign.status === 'draft' && (
                    <Button size="sm" onClick={() => handleSendCampaign(campaign.id)}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Now
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Audience</p>
                      <p className="font-medium">{campaign.audience}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Recipients</p>
                      <p className="font-medium">{campaign.total_recipients || 0}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Sent</p>
                      <p className="font-medium">{campaign.sent_count || 0}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {campaigns.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first campaign to start engaging with users
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCampaigns;
