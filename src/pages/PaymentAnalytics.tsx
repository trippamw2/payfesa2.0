import { PageLayout } from '@/components/layout/PageLayout';
import { PaymentAnalyticsDashboard } from '@/components/payments/PaymentAnalyticsDashboard';

export default function PaymentAnalytics() {
  return (
    <PageLayout
      title="Payment Analytics"
      subtitle="Analyze your payment patterns and trends"
    >
      <PaymentAnalyticsDashboard />
    </PageLayout>
  );
}
