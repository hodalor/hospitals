import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SectionCard from '../components/common/SectionCard';
import StatCard from '../components/common/StatCard';

function DashboardPage({ data, auth }) {
  if (!auth.canViewData('overview')) {
    return (
      <SectionCard eyebrow="Access control" title="Overview access is restricted">
        <p className="panel-copy">The active user cannot view overview analytics.</p>
      </SectionCard>
    );
  }

  return (
    <div className="page-stack">
      <div className="stats-grid">
        {data.kpis.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="content-grid">
        <SectionCard eyebrow="Visit flow" title="Current visit stages" className="panel-wide">
          <div className="chart-panel">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.stageChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eef6" />
                <XAxis dataKey="name" tick={{ fill: '#5d7493', fontSize: 12 }} />
                <YAxis tick={{ fill: '#5d7493', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#1570ef" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Billing" title="Invoice status mix">
          <div className="chart-panel">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.billingChart}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  fill="#0fb5ae"
                />
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Revenue" title="Collected revenue by source">
          <div className="chart-panel">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eef6" />
                <XAxis dataKey="name" tick={{ fill: '#5d7493', fontSize: 12 }} />
                <YAxis tick={{ fill: '#5d7493', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#f79009" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Activity trend" title="Appointments and visits" className="panel-wide">
          <div className="chart-panel">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trendChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eef6" />
                <XAxis dataKey="day" tick={{ fill: '#5d7493', fontSize: 12 }} />
                <YAxis tick={{ fill: '#5d7493', fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="appointments" stroke="#1570ef" strokeWidth={3} />
                <Line type="monotone" dataKey="visits" stroke="#0fb5ae" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Department load" title="Visits by department">
          <div className="chart-panel">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.departmentChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eef6" />
                <XAxis type="number" tick={{ fill: '#5d7493', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#5d7493', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="visits" fill="#1d3348" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Queue load" title="Operational desks waiting now">
          <div className="chart-panel">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.queueChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eef6" />
                <XAxis type="number" tick={{ fill: '#5d7493', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#5d7493', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0fb5ae" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default DashboardPage;
