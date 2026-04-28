"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function MonthFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [currentMonth, setCurrentMonth] = useState("");

    useEffect(() => {
        const monthParam = searchParams.get("month");
        if (monthParam) {
            setCurrentMonth(monthParam);
            document.cookie = `selectedMonth=${monthParam}; path=/; max-age=31536000`;
        } else {
            const match = document.cookie.match(/(?:^|; )selectedMonth=([^;]*)/);
            if (match) {
                const savedMonth = match[1];
                setCurrentMonth(savedMonth);

                // Keep URL in sync with cookie if loading without param
                const params = new URLSearchParams(searchParams.toString());
                params.set("month", savedMonth);
                router.replace(`${pathname}?${params.toString()}`);
            } else {
                const defaultMonth = "all"; // Defaulting to Yearly view
                setCurrentMonth(defaultMonth);
                document.cookie = `selectedMonth=${defaultMonth}; path=/; max-age=31536000`;
            }
        }
    }, [searchParams, pathname, router]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setCurrentMonth(val);
        document.cookie = `selectedMonth=${val}; path=/; max-age=31536000`;
        const params = new URLSearchParams(searchParams.toString());
        params.set("month", val);
        router.push(`${pathname}?${params.toString()}`);
    };

    const months = [
        { value: "01", label: "Janeiro" },
        { value: "02", label: "Fevereiro" },
        { value: "03", label: "Março" },
        { value: "04", label: "Abril" },
        { value: "05", label: "Maio" },
        { value: "06", label: "Junho" },
        { value: "07", label: "Julho" },
        { value: "08", label: "Agosto" },
        { value: "09", label: "Setembro" },
        { value: "10", label: "Outubro" },
        { value: "11", label: "Novembro" },
        { value: "12", label: "Dezembro" },
    ];

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Filtrar Período:</label>
            <select
                value={currentMonth}
                onChange={handleChange}
                className="glass-input"
                style={{ padding: "0.5rem 0.75rem", width: "auto", cursor: "pointer", height: "100%", fontSize: "0.75rem", fontWeight: 700 }}
            >
                <option value="all" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>ANO INTEIRO 2026</option>
                {months.map(m => (
                    <option key={m.value} value={`2026-${m.value}`} style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                        {m.label.toUpperCase()}
                    </option>
                ))}
            </select>
        </div>
    );
}
