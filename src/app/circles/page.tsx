import type { Metadata } from "next";
import { listOpenCircles } from "@/server/services/circle.service";
import { CircleCard } from "@/components/circle/CircleCard";
import { CircleFilters } from "@/components/circle/CircleFilters";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Browse Circles" };

interface Props {
  searchParams: {
    page?: string;
    frequency?: string;
    minAmount?: string;
    maxAmount?: string;
    search?: string;
  };
}

export default async function CirclesPage({ searchParams }: Props) {
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const { data: circles } = await listOpenCircles(page, 20, {
    frequency: searchParams.frequency as any,
    minAmount: searchParams.minAmount ? parseInt(searchParams.minAmount, 10) : undefined,
    maxAmount: searchParams.maxAmount ? parseInt(searchParams.maxAmount, 10) : undefined,
    search: searchParams.search,
  });

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>Open Circles</h1>
          <Link href="/circles/create" className="btn btn--accent">+ New Circle</Link>
        </div>

        <CircleFilters />

        {circles.length === 0 ? (
          <div className={styles.empty}>
            <p>No circles found matching your criteria.</p>
            <Link href="/circles" className="btn btn--secondary">Clear all filters</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {circles.map((circle) => (
              <CircleCard key={circle.id} circle={circle} members={[]} showJoin />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
