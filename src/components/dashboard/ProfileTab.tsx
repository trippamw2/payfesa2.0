import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, User as UserIcon, Phone, Award, Globe, Trophy, Star, Crown, Zap, Bell, Info, Edit, Lock, Smartphone, Wallet, Building2, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import AchievementsBadge from '@/components/profile/AchievementsBadge';
import { User, Profile } from '@/types';
import { ShareDialog } from '@/components/social/ShareDialog';
import { TrustedUserBadge } from '@/components/social/TrustedUserBadge';

interface Props {
  user: User;
  profile: Profile;
}

const ProfileTab = ({ user, profile }: Props) => {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation(language);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editPinOpen, setEditPinOpen] = useState(false);
  const [newName, setNewName] = useState(profile.name || '');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [contributionsCount, setContributionsCount] = useState(0);
  const [groupsCount, setGroupsCount] = useState(0);
  const [onTimePercentage, setOnTimePercentage] = useState(100);

  useEffect(() => {
    // Check for new achievements when component mounts
    checkAchievements();
    checkAdminRole();
    fetchUserStats();
  }, [user.id]);

  const checkAdminRole = async () => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin role:', error);
      // Silent fail - admin check is not critical
    }
  };

  const fetchUserStats = async () => {
    try {
      // Get contributions count
      const { count: contribCount } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');
      
      setContributionsCount(contribCount || 0);

      // Get groups count
      const { count: groupsCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setGroupsCount(groupsCount || 0);

      // Calculate on-time percentage
      const { data: contributions } = await supabase
        .from('contributions')
        .select('status, completed_at, created_at')
        .eq('user_id', user.id);
      
      if (contributions && contributions.length > 0) {
        const onTime = contributions.filter(c => 
          c.status === 'completed' && c.completed_at && c.created_at &&
          new Date(c.completed_at).getTime() - new Date(c.created_at).getTime() < 24 * 60 * 60 * 1000
        ).length;
        setOnTimePercentage(Math.round((onTime / contributions.length) * 100));
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      toast.error('Failed to load profile stats');
    }
  };

  const checkAchievements = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No active session for achievements check');
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-achievements', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {}
      });

      if (error) {
        console.error('Error checking achievements:', error);
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
      // Silent fail - achievements check is not critical
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const handleLanguageChange = async (newLang: 'en' | 'ny') => {
    setLanguage(newLang);
    
    // Update in database
    const { error } = await supabase
      .from('users')
      .update({ language: newLang })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating language:', error);
      toast.error('Failed to update language');
    } else {
      toast.success('Language updated');
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({ name: newName.trim() })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    } else {
      toast.success('Name updated successfully');
      setEditNameOpen(false);
      // Force parent component to refetch instead of full reload
      window.dispatchEvent(new CustomEvent('profile-updated'));
    }
  };

  const handleUpdatePin = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      toast.error('Please fill all fields');
      return;
    }

    if (newPin.length !== 6 || confirmPin.length !== 6) {
      toast.error('PIN must be 6 digits');
      return;
    }

    if (newPin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }

    // Verify current PIN
    const isValid = await bcrypt.compare(currentPin, profile.pin_hash);
    if (!isValid) {
      toast.error('Current PIN is incorrect');
      return;
    }

    // Hash new PIN
    const newPinHash = await bcrypt.hash(newPin, 10);

    const { error } = await supabase
      .from('users')
      .update({ pin_hash: newPinHash })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating PIN:', error);
      toast.error('Failed to update PIN');
    } else {
      toast.success('PIN updated successfully');
      setEditPinOpen(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    }
  };

  const getBadges = (score: number) => {
    const badges = [];
    if (score === 100) badges.push({ icon: Crown, label: 'Platinum', color: 'text-primary' });
    else if (score >= 80) badges.push({ icon: Trophy, label: 'Gold', color: 'text-warning' });
    else if (score >= 60) badges.push({ icon: Star, label: 'Silver', color: 'text-muted-foreground' });
    else if (score >= 40) badges.push({ icon: Award, label: 'Bronze', color: 'text-accent' });
    else if (score >= 20) badges.push({ icon: Zap, label: 'Perfect', color: 'text-info' });
    return badges;
  };

  const getBonus = (score: number) => {
    if (score === 100) return { text: '5% bonus on payouts', requirement: 'Perfect score maintained' };
    if (score >= 80) return { text: '4% bonus on payouts', requirement: 'Gold tier: 10+ on-time contributions' };
    if (score >= 60) return { text: '2.5% bonus on payouts', requirement: 'Silver tier: 5+ on-time contributions' };
    if (score >= 40) return { text: '1% bonus on payouts', requirement: 'Bronze tier: 3+ on-time contributions' };
    return null;
  };

  // Use actual trust_score from users table, not a default
  const trustScore = profile.trust_score || 50;
  const badges = getBadges(trustScore);
  const bonus = getBonus(trustScore);

  return (
    <div className="space-y-2 pb-4 max-w-4xl mx-auto">
      {/* Profile Header */}
      <Card className="relative overflow-hidden mx-3">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background" />
        <div className="relative p-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-lg font-bold">
              {profile.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 space-y-1">
              <div>
                <h2 className="text-sm font-bold">{profile.name || 'User'}</h2>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span className="text-[9px]">{profile.phone_number}</span>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="flex gap-3">
                <div className="flex items-center gap-1 text-[10px]">
                  <Users className="h-3 w-3 text-primary" />
                  <span className="font-semibold">{groupsCount}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <Award className="h-3 w-3 text-primary" />
                  <span className="font-semibold">{contributionsCount}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <Trophy className="h-3 w-3 text-primary" />
                  <span className="font-semibold">{onTimePercentage}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Achievements Card */}
      <AchievementsBadge userId={user.id} />

      {/* Account Info */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold px-1">Account Settings</h3>
        
        <Card className="p-3 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-medium">{profile.name}</p>
              </div>
            </div>
            <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Name</DialogTitle>
                  <DialogDescription>
                    Change your display name
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditNameOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateName}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        <Card className="p-3 border border-border/50">
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Phone Number</p>
              <p className="text-sm font-medium">{profile.phone_number}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Security PIN</p>
                <p className="text-sm font-medium">••••••</p>
              </div>
            </div>
            <Dialog open={editPinOpen} onOpenChange={setEditPinOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change PIN</DialogTitle>
                  <DialogDescription>
                    Update your security PIN
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current PIN</Label>
                    <InputOTP maxLength={6} value={currentPin} onChange={setCurrentPin}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <div className="space-y-2">
                    <Label>New PIN</Label>
                    <InputOTP maxLength={6} value={newPin} onChange={setNewPin}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New PIN</Label>
                    <InputOTP maxLength={6} value={confirmPin} onChange={setConfirmPin}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditPinOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdatePin}>
                    Update PIN
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        <Card className="p-3 border border-border/50">
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Language</p>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ny">Chichewa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      {/* App Settings */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold px-1">App Settings</h3>
        
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate('/settings')}
        >
          <Lock className="h-4 w-4 mr-3" />
          <span className="text-sm">Settings</span>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate('/payouts')}
        >
          <Wallet className="h-4 w-4 mr-3" />
          <span className="text-sm">My Payouts</span>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate('/achievements')}
        >
          <Award className="h-4 w-4 mr-3" />
          <span className="text-sm">My Achievements</span>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate('/trust-score')}
        >
          <Award className="h-4 w-4 mr-3" />
          <span className="text-sm">Trust Score History</span>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate('/leaderboard')}
        >
          <Trophy className="h-4 w-4 mr-3" />
          <span className="text-sm">Leaderboard</span>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate('/notification-settings')}
        >
          <Bell className="h-4 w-4 mr-3" />
          <span className="text-sm">Notification Settings</span>
        </Button>
      </div>

      {/* Admin Section */}
      {isAdmin && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold px-1 text-purple-600">Admin Controls</h3>
          
          <Button
            variant="outline"
            className="w-full justify-start border-purple-200 hover:bg-purple-50"
            onClick={() => navigate('/admin/dashboard')}
          >
            <Trophy className="h-4 w-4 mr-3 text-purple-600" />
            <span className="text-sm">Analytics Dashboard</span>
            <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700">
              Admin
            </Badge>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start border-purple-200 hover:bg-purple-50"
            onClick={() => navigate('/admin/payouts')}
          >
            <Crown className="h-4 w-4 mr-3 text-purple-600" />
            <span className="text-sm">Payout Approvals</span>
            <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700">
              Admin
            </Badge>
          </Button>
        </div>
      )}

      {/* Logout Button */}
      <Button
        onClick={handleLogout}
        variant="destructive"
        className="w-full"
      >
        <LogOut className="h-4 w-4 mr-2" />
        {t('logout')}
      </Button>

      {/* Share Dialog */}
      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title="My PayFesa Trust Score"
        shareText={`I'm a trusted member on PayFesa with a ${trustScore} trust score! 🏆`}
      >
        <TrustedUserBadge
          userName={profile.name}
          trustScore={trustScore}
          totalContributions={contributionsCount}
          groupsCompleted={groupsCount}
          onTimePayments={onTimePercentage}
        />
      </ShareDialog>
    </div>
  );
};

export default ProfileTab;
