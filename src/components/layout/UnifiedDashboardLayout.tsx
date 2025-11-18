/**
 * Unified Dashboard Layout
 * Consistent layout for both user dashboard and admin panel
 */

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnifiedDashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  headerActions?: ReactNode;
  gradient?: string;
  icon?: ReactNode;
  onMenuClick?: () => void;
}

const UnifiedDashboardLayout = ({
  children,
  title,
  subtitle,
  showBackButton = false,
  headerActions,
  gradient = 'from-primary via-primary/90 to-primary/80',
  icon,
  onMenuClick
}: UnifiedDashboardLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={cn('bg-gradient-to-br text-primary-foreground', gradient)}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {showBackButton ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="hover:bg-white/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              ) : onMenuClick ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMenuClick}
                  className="hover:bg-white/10 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              ) : null}
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-white/10">
                    {icon}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
                  {subtitle && (
                    <p className="text-sm md:text-base opacity-90 mt-1">{subtitle}</p>
                  )}
                </div>
              </div>
            </div>
            {headerActions && (
              <div className="hidden sm:block">{headerActions}</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
};

export default UnifiedDashboardLayout;
