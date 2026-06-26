import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashSummaryQuery, useDashChartsQuery } from '../features/dashboard/dashboardApi';
import StatCard from '../components/StatCard';
import { PageHeader, SectionCard } from '../components/ui';
import { inr } from '../lib/format';

const PIE_COLORS = ['#0f766e', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#94a3b8'];

export default function Dashboard() {
  const { data: sum } = useDashSummaryQuery();
  const { data: charts } = useDashChartsQuery();
  const s = sum?.data || {};
  const c = charts?.data || {};

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live overview of operations" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Stock on hand value" value={inr(s.stockValue)} icon="📦" accent="brand" />
        <StatCard label="Low-stock items" value={s.lowStockCount ?? '—'} sub="at/below reorder level" icon="⚠️" accent="amber" />
        <StatCard label="This month rework loss" value={inr(s.monthReworkLoss)} icon="🔧" accent="red" />
        <StatCard label="Open leads" value={s.openLeads ?? '—'} icon="🎯" accent="brand" />
        <StatCard label="Today's production" value={`${s.production?.done ?? 0}/${s.production?.total ?? 0} done`} sub={`${s.production?.pending ?? 0} pending`} icon="🏭" accent="slate" />
        <StatCard label="Present today" value={s.presentToday ?? '—'} icon="👥" accent="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Rework loss trend (6 mo)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={c.reworkLossTrend || []}><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Line type="monotone" dataKey="loss" stroke="#0f766e" strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard title="Leads by status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={c.leadsByStatus || []} dataKey="count" nameKey="status" outerRadius={80} label>{(c.leadsByStatus || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Legend /></PieChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard title="Sales: GST vs Non-GST">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={c.salesGstSplit || []}><XAxis dataKey="type" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="amount" fill="#0f766e" /></BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>
    </div>
  );
}
