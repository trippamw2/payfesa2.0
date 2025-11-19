import { PageLayout } from '@/components/layout/PageLayout';
import { PaymentScheduleCalendar } from '@/components/payments/PaymentScheduleCalendar';

export default function PaymentSchedule() {
  return (
    <PageLayout
      title="Payment Schedule"
      subtitle="View and manage your scheduled payments"
    >
      <PaymentScheduleCalendar />
    </PageLayout>
  );
}
