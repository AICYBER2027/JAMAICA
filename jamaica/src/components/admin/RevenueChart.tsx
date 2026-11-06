"use client";
import { useState } from "react";
import { formatBRL } from "@/lib/money";

/** Daily revenue as thin bars. One series, so the heading names it and there is no legend. */
export function RevenueChart({ data, title }: { data: { day: string; revenue: number; orders: number }[]; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 220, padL = 56, padB = 26, padT = 12;
  const max = Math.max(100000, ...data.map((d) => d.revenue));
  const nice = niceCeil(max);
  const bw = (W - padL) / data.length;
  const barW = Math.max(3, Math.min(28, bw - 2));
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / nice);
  const ticks = [0, nice / 2, nice];
  const fmtDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const labelEvery = Math.ceil(data.length / 7);
  const empty = data.every((d) => d.revenue === 0);

  return (
    <figure className="relative">
      <figcaption className="mb-3 font-semibold">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}. ${empty ? "No sales in this period." : `Highest day ${formatBRL(Math.max(...data.map((d) => d.revenue)))}.`}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="#e1e4e1" strokeWidth={1} />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#545c58" className="tabular">{compactBRL(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * bw + (bw - barW) / 2;
          const h = Math.max(0, y(0) - y(d.revenue));
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${fmtDay(d.day)}: ${formatBRL(d.revenue)}, ${d.orders} orders`}>
              <rect x={padL + i * bw} y={padT} width={bw} height={H - padT - padB} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + barW - r} Q${x + barW},${y(0) - h} ${x + barW},${y(0) - h + r} V${y(0)} Z`}
                  fill={hover === null || hover === i ? "#0f7a55" : "#7fbca5"}
                />
              )}
              {i % labelEvery === 0 && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#545c58">{fmtDay(d.day)}</text>
              )}
            </g>
          );
        })}
        <line x1={padL} x2={W} y1={y(0)} y2={y(0)} stroke="#050505" strokeWidth={1} />
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-8 bg-black px-3 py-2 text-small text-white" style={{ left: `clamp(0px, calc(${((padL + hover * bw) / W) * 100}% - 60px), calc(100% - 170px))` }}>
          <p className="font-semibold">{fmtDay(data[hover].day)}</p>
          <p className="tabular">{formatBRL(data[hover].revenue)}</p>
          <p className="tabular text-mist">{data[hover].orders} {data[hover].orders === 1 ? "order" : "orders"}</p>
        </div>
      )}
      {empty && <p className="mt-2 text-small text-muted">No paid orders in this period yet. Revenue appears here as soon as a payment is confirmed.</p>}
      <details className="mt-3 text-small">
        <summary className="cursor-pointer text-muted">Show as table</summary>
        <table className="table mt-2">
          <thead><tr><th>Day</th><th className="num">Orders</th><th className="num">Revenue</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}><td>{fmtDay(d.day)}</td><td className="num">{d.orders}</td><td className="num">{formatBRL(d.revenue)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function niceCeil(v: number) {
  const exp = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * exp >= v) return m * exp;
  return 10 * exp;
}
function compactBRL(cents: number) {
  const r = cents / 100;
  return r >= 1000 ? `R$ ${(r / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(r)}`;
}
