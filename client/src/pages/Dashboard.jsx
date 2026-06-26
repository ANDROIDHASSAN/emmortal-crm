import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { useDashSummaryQuery, useDashChartsQuery } from '../features/dashboard/dashboardApi';
import StatCard from '../components/StatCard';
import { PageHeader, SectionCard } from '../components/ui';
import { inr } from '../lib/format';

const PIE_COLORS = ['#059669', '#f97316', '#34d399', '#f43f5e', '#6366f1', '#94a3b8'];

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 12px 40px rgba(16,24,40,.12)', fontSize: 12 },
  cursor: { fill: 'rgba(5,150,105,.06)' },
};

export default function Dashboard() {
  const { data: sum } = useDashSummaryQuery();
  const { data: charts } = useDashChartsQuery();
  const s = sum?.data || {};
  const c = charts?.data || {};

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live overview of operations" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Stock on hand value" value={inr(s.stockValue)} highlight />
        <StatCard label="Low-stock items" value={s.lowStockCount ?? '—'} sub="at/below reorder level" />
        <StatCard label="This month rework loss" value={inr(s.monthReworkLoss)} />
        <StatCard label="Open leads" value={s.openLeads ?? '—'} />
        <StatCard label="Today's production" value={`${s.production?.done ?? 0}/${s.production?.total ?? 0} done`} sub={`${s.production?.pending ?? 0} pending`} />
        <StatCard label="Present today" value={s.presentToday ?? '—'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Rework loss trend (6 mo)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={c.reworkLossTrend || []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="lossLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" />
              <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="loss" stroke="url(#lossLine)" strokeWidth={3} dot={{ r: 3, fill: '#059669' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard title="Leads by status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={c.leadsByStatus || []} dataKey="count" nameKey="status" innerRadius={48} outerRadius={80} paddingAngle={3} stroke="none">
                {(c.leadsByStatus || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard title="Sales: GST vs Non-GST">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={c.salesGstSplit || []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="type" fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" />
              <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="amount" fill="#059669" radius={[8, 8, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>
    </div>
  );
}
