import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface UserLineData {
  name: string;
  thisYear: number;
  lastYear: number;
}

const Dashboard: React.FC = () => {
  const usersLine: UserLineData[] = [
    { name: "Jan", thisYear: 12, lastYear: 6 },
    { name: "Feb", thisYear: 8, lastYear: 12 },
    { name: "Mar", thisYear: 13, lastYear: 9 },
    { name: "Apr", thisYear: 22, lastYear: 8 },
    { name: "May", thisYear: 25, lastYear: 14 },
    { name: "Jun", thisYear: 19, lastYear: 18 },
    { name: "Jul", thisYear: 21, lastYear: 26 },
  ];

  return (
    <div>
      <h1>Dashboard</h1>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={usersLine}>
          <defs>
            <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#111827" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#111827" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="thisYear" stroke="#111827" fill="url(#c1)" />
          <Area type="monotone" dataKey="lastYear" stroke="#D1D5DB" fill="url(#c1)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Dashboard;
