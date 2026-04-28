"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart } from "recharts";

type ChartData = {
    month: string;
    totalOperado: number;
    lucroLiquido: number;
    rentabilidade: number;
};

export default function DashboardCharts({ data }: { data: ChartData[] }) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
    };

    const formatPercent = (val: number) => {
        return `${val.toFixed(2)}%`;
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--card-border)", padding: "1rem", borderRadius: "12px", boxShadow: "var(--shadow-lg)" }}>
                    <p style={{ fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.75rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} style={{ color: entry.color, fontSize: "0.8125rem", display: "flex", justifyContent: "space-between", gap: "2rem", marginBottom: "0.375rem" }}>
                            <span style={{ fontWeight: 600, opacity: 0.8 }}>{entry.name}:</span>
                            <span style={{ fontWeight: 800 }}>{entry.name === "Rentabilidade" ? formatPercent(entry.value) : formatCurrency(entry.value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ width: "100%", height: 350, marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                    <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "0.875rem", paddingTop: "1rem" }} />
                    <Bar yAxisId="left" dataKey="totalOperado" name="Valor Operado" fill="var(--accent-secondary)" radius={[2, 2, 0, 0]} maxBarSize={40} />
                    <Bar yAxisId="left" dataKey="lucroLiquido" name="Lucro Líquido" fill="var(--accent-primary)" radius={[2, 2, 0, 0]} maxBarSize={40} />
                    <Line yAxisId="right" type="monotone" dataKey="rentabilidade" name="Rentabilidade" stroke="var(--accent-orange)" strokeWidth={3} dot={{ r: 3, fill: "var(--accent-orange)", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
