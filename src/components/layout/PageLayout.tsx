/**
 * Standardized Page Layout Component
 * Provides consistent structure across all user pages
 */

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  headerActions?: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
  noPadding?: boolean;
}

export const PageLayout = ({
  children,
  title,
  subtitle,
  showBackButton = true,
  headerActions,
  icon,
  fullWidth = false,
  noPadding = false
}: PageLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground px-2 py-2 shadow-sm">
        <div className={cn("mx-auto", fullWidth ? "max-w-full" : "max-w-6xl")}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="hover:bg-white/10 text-primary-foreground h-7 w-7 flex-shrink-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              )}
              {icon && (
                <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/10 flex-shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate">{title}</h1>
                {subtitle && (
                  <p className="text-[10px] opacity-90 truncate">{subtitle}</p>
                )}
              </div>
            </div>
            {headerActions && (
              <div className="flex-shrink-0">{headerActions}</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        "mx-auto",
        fullWidth ? "max-w-full" : "max-w-6xl",
        noPadding ? "" : "p-2 space-y-2"
      )}>
        {children}
      </div>
    </div>
  );
};
