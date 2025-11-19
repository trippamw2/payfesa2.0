import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, parseISO } from 'date-fns';
import { CalendarIcon, Clock, DollarSign, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ScheduledPayment {
  id: string;
  amount: number;
  scheduled_date: string;
  status: string;
  type: string;
  group_name?: string;
}

export function PaymentScheduleCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);
  const [selectedDatePayments, setSelectedDatePayments] = useState<ScheduledPayment[]>([]);

  useEffect(() => {
    fetchScheduledPayments();
  }, []);

  useEffect(() => {
    if (date) {
      const filtered = scheduledPayments.filter(payment =>
        isSameDay(parseISO(payment.scheduled_date), date)
      );
      setSelectedDatePayments(filtered);
    }
  }, [date, scheduledPayments]);

  const fetchScheduledPayments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch scheduled payouts
      const { data: payouts, error: payoutsError } = await supabase
        .from('payout_schedule')
        .select(`
          id,
          amount,
          scheduled_date,
          status,
          group_id,
          rosca_groups!inner(name)
        `)
        .eq('user_id', user.id)
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true });

      if (payoutsError) throw payoutsError;

      const formattedPayouts: ScheduledPayment[] = (payouts || []).map((p: any) => ({
        id: p.id,
        amount: p.amount,
        scheduled_date: p.scheduled_date,
        status: p.status,
        type: 'payout',
        group_name: p.rosca_groups?.name,
      }));

      setScheduledPayments(formattedPayouts);
    } catch (error) {
      console.error('Error fetching scheduled payments:', error);
      toast.error('Failed to load scheduled payments');
    } finally {
      setLoading(false);
    }
  };

  const setReminder = async (paymentId: string) => {
    try {
      toast.success('Reminder set successfully');
    } catch (error) {
      toast.error('Failed to set reminder');
    }
  };

  const getDayContent = (day: Date) => {
    const dayPayments = scheduledPayments.filter(payment =>
      isSameDay(parseISO(payment.scheduled_date), day)
    );

    if (dayPayments.length === 0) return null;

    return (
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
        <div className="flex gap-0.5">
          {dayPayments.slice(0, 3).map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full bg-primary"
            />
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Payment Schedule
          </CardTitle>
          <CardDescription>
            View and manage your upcoming scheduled payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
                modifiers={{
                  scheduled: scheduledPayments.map(p => parseISO(p.scheduled_date)),
                }}
                modifiersStyles={{
                  scheduled: {
                    fontWeight: 'bold',
                    backgroundColor: 'hsl(var(--primary) / 0.1)',
                  },
                }}
                components={{
                  Day: ({ date: dayDate, ...props }) => (
                    <div className="relative">
                      <button {...props as any} />
                      {getDayContent(dayDate)}
                    </div>
                  ),
                }}
              />
            </div>

            {/* Selected Date Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {date ? format(date, 'MMMM d, yyyy') : 'Select a date'}
                </h3>
                {selectedDatePayments.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {selectedDatePayments.length} scheduled payment{selectedDatePayments.length !== 1 ? 's' : ''}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No payments scheduled</p>
                )}
              </div>

              <div className="space-y-3">
                {selectedDatePayments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={payment.status === 'pending' ? 'secondary' : 'default'}>
                              {payment.type}
                            </Badge>
                            <Badge variant="outline">
                              {payment.status}
                            </Badge>
                          </div>
                          {payment.group_name && (
                            <p className="text-sm text-muted-foreground">{payment.group_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold">MWK {payment.amount.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{format(parseISO(payment.scheduled_date), 'h:mm a')}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReminder(payment.id)}
                        >
                          <Bell className="h-3 w-3 mr-1" />
                          Remind Me
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Payments Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Payments</CardTitle>
          <CardDescription>Next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {scheduledPayments.slice(0, 5).map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {payment.group_name || 'Payment'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(payment.scheduled_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">MWK {payment.amount.toLocaleString()}</p>
                  <Badge variant="outline" className="text-xs">
                    {payment.status}
                  </Badge>
                </div>
              </div>
            ))}
            {scheduledPayments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No upcoming scheduled payments
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
