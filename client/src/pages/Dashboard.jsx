import { useDashboardSummaryQuery, useDashboardChartsQuery } from '../features/dashboard/dashboardApi';
import StatCard from '../components/StatCard';
import { PageHeader, SectionCard } from '../components/ui';
import { inr } from '../lib/format';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE = ['#0f766e', '#f59e0b', '#10b981', '#ef4444'];

export default function Dashboard() {
  const { data: sum } = useDashboardSummaryQuery();
  const { data: charts } = useDashboardChartsQuery();
  const s = sum?.data;
  const c = charts?.data;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live overview of operations" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Stock on hand value" value={inr(s?.stockValue)} accent="brand" icon="📦" />
        <StatCard label="Low-stock items" value={s?.lowStockCount ?? '—'} accent="amber" icon="⚠️" sub="at/below reorder level" />
        <StatCard label="This month rework loss" value={inr(s?.monthReworkLoss)} accent="red" icon="🔧" />
        <StatCard label="Open leads" value={s?.openLeads ?? '—'} accent="emerald" icon="🎯" />
        <StatCard label="Today's production" value={`${s?.production?.done ?? 0}/${s?.production?.total ?? 0} done`} accent="slate" icon="🏭" sub={`${s?.production?.pending ?? 0} pending`} />
        <StatCard label="Present today" value={s?.presentToday ?? '—'} accent="brand" icon="👥" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Rework loss trend (6 mo)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={c?.reworkLossTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v) => inr(v)} />
              <Line type="monotone" dataKey="loss" stroke="#0f766e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Leads by status">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={c?.leadsByStatus || []} dataKey="count" nameKey="status" outerRadius={80} label>
                {(c?.leadsByStatus || []).map((e, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Sales: GST vs Non-GST">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={c?.salesGstSplit || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="type" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v) => inr(v)} />
              <Bar dataKey="amount" fill="#0d9488" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>
    </div>
  );
}
