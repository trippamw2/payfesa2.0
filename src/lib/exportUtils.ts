import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// CSV Export Functions
export const exportToCSV = (data: any[], filename: string) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// PDF Export Functions
export const exportToPDF = (
  title: string,
  headers: string[],
  rows: any[][],
  filename: string
) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  
  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// User List Export
export const exportUserList = (users: any[], format: 'csv' | 'pdf') => {
  if (format === 'csv') {
    const csvData = users.map(user => ({
      'Full Name': user.name || 'N/A',
      'Phone Number': user.phone_number || 'N/A',
      'Trust Score': user.trust_score || 0,
      'Language': user.language || 'en',
      'Roles': user.roles?.join(', ') || 'user',
      'Status': user.banned ? 'Banned' : 'Active',
      'Joined': new Date(user.created_at).toLocaleDateString(),
    }));
    exportToCSV(csvData, 'user_list');
  } else {
    const headers = ['Full Name', 'Phone Number', 'Trust Score', 'Roles', 'Status', 'Joined'];
    const rows = users.map(user => [
      user.name || 'N/A',
      user.phone_number || 'N/A',
      (user.trust_score || 0).toString(),
      user.roles?.join(', ') || 'user',
      user.banned ? 'Banned' : 'Active',
      new Date(user.created_at).toLocaleDateString(),
    ]);
    exportToPDF('User List Report', headers, rows, 'user_list');
  }
};

// Analytics Report Export
export const exportAnalyticsReport = (analytics: any, format: 'csv' | 'pdf') => {
  if (!analytics || !analytics.overview) {
    console.error('Invalid analytics data');
    return;
  }
  
  if (format === 'csv') {
    const csvData = [
      { Metric: 'Total Users', Value: analytics.overview.totalUsers || 0 },
      { Metric: 'Total Groups', Value: analytics.overview.totalGroups || 0 },
      { Metric: 'Active Groups', Value: analytics.overview.activeGroups || 0 },
      { Metric: 'Total Contributions', Value: analytics.overview.totalContributions || 0 },
      { Metric: 'Completed Contributions', Value: analytics.overview.completedContributions || 0 },
      { Metric: 'Contribution Rate', Value: `${analytics.overview.contributionRate || 0}%` },
      { Metric: 'Total Contribution Amount', Value: `MWK ${(analytics.overview.totalContributionAmount || 0).toLocaleString()}` },
      { Metric: 'Total Payouts', Value: analytics.overview.totalPayouts || 0 },
      { Metric: 'Completed Payouts', Value: analytics.overview.completedPayouts || 0 },
      { Metric: 'Pending Payouts', Value: analytics.overview.pendingPayouts || 0 },
      { Metric: 'Total Commission Revenue', Value: `MWK ${(analytics.overview.totalCommissionRevenue || 0).toLocaleString()}` },
      { Metric: 'Total Payout Amount', Value: `MWK ${(analytics.overview.totalPayoutAmount || 0).toLocaleString()}` },
      { Metric: 'Average Trust Score', Value: analytics.overview.averageTrustScore || 0 },
      { Metric: 'Total Escrow Balance', Value: `MWK ${(analytics.overview.totalEscrowBalance || 0).toLocaleString()}` },
    ];
    exportToCSV(csvData, 'analytics_report');
  } else {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Users', (analytics.overview.totalUsers || 0).toString()],
      ['Total Groups', (analytics.overview.totalGroups || 0).toString()],
      ['Active Groups', (analytics.overview.activeGroups || 0).toString()],
      ['Total Contributions', (analytics.overview.totalContributions || 0).toString()],
      ['Completed Contributions', (analytics.overview.completedContributions || 0).toString()],
      ['Contribution Rate', `${analytics.overview.contributionRate || 0}%`],
      ['Total Contribution Amount', `MWK ${(analytics.overview.totalContributionAmount || 0).toLocaleString()}`],
      ['Total Payouts', (analytics.overview.totalPayouts || 0).toString()],
      ['Completed Payouts', (analytics.overview.completedPayouts || 0).toString()],
      ['Pending Payouts', (analytics.overview.pendingPayouts || 0).toString()],
      ['Total Commission', `MWK ${(analytics.overview.totalCommissionRevenue || 0).toLocaleString()}`],
      ['Total Payout Amount', `MWK ${(analytics.overview.totalPayoutAmount || 0).toLocaleString()}`],
      ['Average Trust Score', (analytics.overview.averageTrustScore || 0).toString()],
      ['Total Escrow Balance', `MWK ${(analytics.overview.totalEscrowBalance || 0).toLocaleString()}`],
    ];
    exportToPDF('Analytics Report', headers, rows, 'analytics_report');
  }
};

// Contribution History Export
export const exportContributionHistory = async (supabase: any, format: 'csv' | 'pdf') => {
  const { data: contributions } = await supabase
    .from('contributions')
    .select(`
      *,
      profiles:user_id (full_name, phone_number),
      rosca_groups:group_id (name)
    `)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (!contributions) return;

  if (format === 'csv') {
    const csvData = contributions.map((c: any) => ({
      'Date': new Date(c.contribution_date).toLocaleDateString(),
      'User': c.profiles?.full_name || 'Unknown',
      'Phone': c.profiles?.phone_number || 'N/A',
      'Group': c.rosca_groups?.name || 'Unknown',
      'Amount': `MWK ${Number(c.amount).toLocaleString()}`,
      'Cycle': c.cycle_number,
      'Payment Method': c.payment_method,
      'Reference': c.mobile_money_reference || 'N/A',
      'Status': c.status,
      'Verified': c.payment_verified ? 'Yes' : 'No',
    }));
    exportToCSV(csvData, 'contribution_history');
  } else {
    const headers = ['Date', 'User', 'Group', 'Amount', 'Cycle', 'Status'];
    const rows = contributions.map((c: any) => [
      new Date(c.contribution_date).toLocaleDateString(),
      c.profiles?.full_name || 'Unknown',
      c.rosca_groups?.name || 'Unknown',
      `MWK ${Number(c.amount).toLocaleString()}`,
      c.cycle_number.toString(),
      c.status,
    ]);
    exportToPDF('Contribution History', headers, rows, 'contribution_history');
  }
};

// Payout Records Export
export const exportPayoutRecords = async (supabase: any, format: 'csv' | 'pdf') => {
  const { data: payouts } = await supabase
    .from('payouts')
    .select(`
      *,
      profiles:recipient_id (full_name, phone_number),
      rosca_groups:group_id (name)
    `)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (!payouts) return;

  if (format === 'csv') {
    const csvData = payouts.map((p: any) => ({
      'Date': new Date(p.payout_date || p.created_at).toLocaleDateString(),
      'Recipient': p.profiles?.full_name || 'Unknown',
      'Phone': p.profiles?.phone_number || 'N/A',
      'Group': p.rosca_groups?.name || 'Unknown',
      'Gross Amount': `MWK ${Number(p.gross_amount || 0).toLocaleString()}`,
      'Commission': `MWK ${Number(p.commission_amount || 0).toLocaleString()}`,
      'Net Amount': `MWK ${Number(p.amount).toLocaleString()}`,
      'Cycle': p.cycle_number,
      'Status': p.status,
      'Reference': p.mobile_money_reference || 'N/A',
    }));
    exportToCSV(csvData, 'payout_records');
  } else {
    const headers = ['Date', 'Recipient', 'Group', 'Net Amount', 'Commission', 'Status'];
    const rows = payouts.map((p: any) => [
      new Date(p.payout_date || p.created_at).toLocaleDateString(),
      p.profiles?.full_name || 'Unknown',
      p.rosca_groups?.name || 'Unknown',
      `MWK ${Number(p.amount).toLocaleString()}`,
      `MWK ${Number(p.commission_amount || 0).toLocaleString()}`,
      p.status,
    ]);
    exportToPDF('Payout Records', headers, rows, 'payout_records');
  }
};

// Trust Score Export
export const exportTrustScores = async (supabase: any, format: 'csv' | 'pdf') => {
  const { data: trustScores } = await supabase
    .from('trust_scores')
    .select(`
      *,
      profiles:user_id (full_name, phone_number),
      rosca_groups:group_id (name)
    `)
    .order('score', { ascending: false })
    .limit(1000);

  if (!trustScores) return;

  if (format === 'csv') {
    const csvData = trustScores.map((ts: any) => ({
      'User': ts.profiles?.full_name || 'Unknown',
      'Phone': ts.profiles?.phone_number || 'N/A',
      'Group': ts.rosca_groups?.name || 'Unknown',
      'Trust Score': ts.score,
      'On-Time Contributions': ts.on_time_contributions,
      'Late Contributions': ts.late_contributions,
      'Missed Contributions': ts.missed_contributions,
      'Last Updated': new Date(ts.updated_at).toLocaleDateString(),
    }));
    exportToCSV(csvData, 'trust_scores');
  } else {
    const headers = ['User', 'Group', 'Score', 'On-Time', 'Late', 'Missed'];
    const rows = trustScores.map((ts: any) => [
      ts.profiles?.full_name || 'Unknown',
      ts.rosca_groups?.name || 'Unknown',
      ts.score.toString(),
      ts.on_time_contributions.toString(),
      ts.late_contributions.toString(),
      ts.missed_contributions.toString(),
    ]);
    exportToPDF('Trust Score Report', headers, rows, 'trust_scores');
  }
};
