import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StandardCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function StandardCard({
  title,
  description,
  icon: Icon,
  iconColor = 'text-primary',
  children,
  actions,
  className,
}: StandardCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`p-2 bg-primary/10 rounded-lg`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
            )}
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
          {actions && <div>{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
