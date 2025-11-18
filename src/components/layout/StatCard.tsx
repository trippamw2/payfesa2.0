import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ value, label, icon: Icon, iconColor = 'text-primary', trend }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {Icon && (
              <div className={`p-1.5 bg-primary/10 rounded`}>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
            )}
          </div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        {trend && (
          <div className={`text-xs font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
    </Card>
  );
}
