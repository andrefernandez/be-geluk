"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function MonthFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [currentMonth, setCurrentMonth] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        const monthParam = searchParams.get("month");
        const startDateParam = searchParams.get("startDate");
        const endDateParam = searchParams.get("endDate");
        
        let monthToSet = monthParam;
        if (!monthToSet) {
            const match = document.cookie.match(/(?:^|; )selectedMonth=([^;]*)/);
            if (match) {
                monthToSet = match[1];
            } else {
                monthToSet = "all";
            }
        }
        
        setCurrentMonth(monthToSet);
        
        let startToSet = startDateParam;
        let endToSet = endDateParam;
        
        if (monthToSet === "custom") {
            if (!startToSet) {
                const matchStart = document.cookie.match(/(?:^|; )startDate=([^;]*)/);
                if (matchStart) startToSet = matchStart[1];
            }
            if (!endToSet) {
                const matchEnd = document.cookie.match(/(?:^|; )endDate=([^;]*)/);
                if (matchEnd) endToSet = matchEnd[1];
            }
        }
        
        if (startToSet) setStartDate(startToSet);
        if (endToSet) setEndDate(endToSet);
        
        // Sync URL with cookies and state
        const params = new URLSearchParams(searchParams.toString());
        let updated = false;
        
        if (params.get("month") !== monthToSet) {
            params.set("month", monthToSet);
            updated = true;
        }
        if (monthToSet === "custom") {
            if (startToSet && params.get("startDate") !== startToSet) {
                params.set("startDate", startToSet);
                updated = true;
            }
            if (endToSet && params.get("endDate") !== endToSet) {
                params.set("endDate", endToSet);
                updated = true;
            }
        } else {
            if (params.has("startDate")) {
                params.delete("startDate");
                updated = true;
            }
            if (params.has("endDate")) {
                params.delete("endDate");
                updated = true;
            }
        }
        
        if (updated) {
            router.replace(`${pathname}?${params.toString()}`);
        }
    }, [searchParams, pathname, router]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setCurrentMonth(val);
        document.cookie = `selectedMonth=${val}; path=/; max-age=31536000`;
        
        const params = new URLSearchParams(searchParams.toString());
        params.set("month", val);
        
        if (val === "custom") {
            // Set default dates if empty
            let start = startDate;
            let end = endDate;
            if (!start) {
                start = "2026-01-01";
                setStartDate(start);
                document.cookie = `startDate=${start}; path=/; max-age=31536000`;
            }
            if (!end) {
                end = "2026-12-31";
                setEndDate(end);
                document.cookie = `endDate=${end}; path=/; max-age=31536000`;
            }
            params.set("startDate", start);
            params.set("endDate", end);
        } else {
            params.delete("startDate");
            params.delete("endDate");
        }
        
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleDateChange = (type: "start" | "end", value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (type === "start") {
            setStartDate(value);
            document.cookie = `startDate=${value}; path=/; max-age=31536000`;
            params.set("startDate", value);
        } else {
            setEndDate(value);
            document.cookie = `endDate=${value}; path=/; max-age=31536000`;
            params.set("endDate", value);
        }
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
                    <option value="custom" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>PERÍODO PERSONALIZADO</option>
                </select>
            </div>
            
            {currentMonth === "custom" && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleDateChange("start", e.target.value)}
                        className="glass-input"
                        style={{ padding: "0.375rem 0.5rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>até</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => handleDateChange("end", e.target.value)}
                        className="glass-input"
                        style={{ padding: "0.375rem 0.5rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}
                    />
                </div>
            )}
        </div>
    );
}
