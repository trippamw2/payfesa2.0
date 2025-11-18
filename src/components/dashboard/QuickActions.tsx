import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, TrendingUp, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export function QuickActions() {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/create-group">
          <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4">
            <Plus className="h-5 w-5" />
            <span className="text-xs">Create Group</span>
          </Button>
        </Link>
        
        <Link to="/join-group">
          <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4">
            <Users className="h-5 w-5" />
            <span className="text-xs">Join Group</span>
          </Button>
        </Link>

        <Link to="/dashboard?tab=wallet">
          <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs">View Wallet</span>
          </Button>
        </Link>

        <Link to="/#fees-faq">
          <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4">
            <Shield className="h-5 w-5" />
            <span className="text-xs">About Fees</span>
          </Button>
        </Link>
      </div>
    </Card>
  );
}
