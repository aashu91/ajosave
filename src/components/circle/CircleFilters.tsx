"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import styles from "./CircleFilters.module.css";
import { Input } from "@/components/ui/Input";
import { SupportedCurrency } from "@/lib/currency";

export function CircleFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [frequency, setFrequency] = useState(searchParams.get("frequency") || "");
  const [minAmount, setMinAmount] = useState(searchParams.get("minAmount") || "");
  const [maxAmount, setMaxAmount] = useState(searchParams.get("maxAmount") || "");
  const [currency, setCurrency] = useState(searchParams.get("currency") || "");

  const updateFilters = useCallback(
    (newFilters: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      // Reset to page 1 when filters change
      params.delete("page");
      router.push(`/circles?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (searchParams.get("search") || "")) {
        updateFilters({ search });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, searchParams, updateFilters]);

  return (
    <div className={styles.filters}>
      <div className={`${styles.filterGroup} ${styles.searchWrapper}`}>
        <label className={styles.label}>Search</label>
        <input
          type="text"
          placeholder="Search by circle name..."
          className={`${styles.input} ${styles.searchInput}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.label}>Frequency</label>
        <select
          className={styles.select}
          value={frequency}
          onChange={(e) => {
            setFrequency(e.target.value);
            updateFilters({ frequency: e.target.value });
          }}
        >
          <option value="">All Frequencies</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.label}>Contribution</label>
        <div className={styles.rangeInputs}>
          <select
            className={styles.select}
            style={{ width: "80px", padding: "0 var(--space-2)" }}
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              updateFilters({ currency: e.target.value });
            }}
          >
            <option value="">Any</option>
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
          <input
            type="number"
            placeholder="Min"
            className={styles.input}
            style={{ width: "80px" }}
            value={minAmount}
            onChange={(e) => {
              setMinAmount(e.target.value);
              updateFilters({ minAmount: e.target.value });
            }}
          />
          <span style={{ color: "var(--color-text-muted)" }}>-</span>
          <input
            type="number"
            placeholder="Max"
            className={styles.input}
            style={{ width: "80px" }}
            value={maxAmount}
            onChange={(e) => {
              setMaxAmount(e.target.value);
              updateFilters({ maxAmount: e.target.value });
            }}
          />
        </div>
      </div>
    </div>
  );
}
