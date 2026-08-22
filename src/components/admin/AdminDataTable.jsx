import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

export default function AdminDataTable({ title, description, columns, rows, loading, emptyText = 'No records found.', actions, onSearch, searchPlaceholder = 'Search records...' }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const visibleRows = useMemo(() => {
    if (onSearch) return rows;
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [onSearch, query, rows]);

  const pages = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const pagedRows = visibleRows.slice((page - 1) * pageSize, page * pageSize);

  function handleQueryChange(value) {
    setQuery(value);
    setPage(1);
    onSearch?.(value);
  }

  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-full overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-brand-border p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-brand-text">{title}</h2>
          {description ? <p className="mt-1 text-sm text-brand-muted">{description}</p> : null}
        </div>
        <input value={query} onChange={(event) => handleQueryChange(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="w-full rounded-xl border border-brand-border bg-brand-background px-4 py-3 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 lg:max-w-xs" />
      </div>

      <div className="max-w-full overflow-x-auto overscroll-x-contain">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-brand-background text-xs uppercase tracking-[0.18em] text-brand-muted">
            <tr>
              {columns.map((column) => <th key={column.key} className="whitespace-nowrap px-5 py-4 font-bold">{column.label}</th>)}
              {actions ? <th className="px-5 py-4 font-bold">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="border-t border-brand-border">
                {columns.map((column) => <td key={column.key} className="px-5 py-4"><div className="h-4 w-28 rounded-full bg-brand-border" /></td>)}
                {actions ? <td className="px-5 py-4"><div className="h-4 w-20 rounded-full bg-brand-border" /></td> : null}
              </tr>
            )) : null}
            {!loading && pagedRows.map((row, index) => (
              <tr key={row.id || row.ProductID || row.OrderID || row.CouponID || index} className="border-t border-brand-border align-top transition hover:bg-brand-background/70">
                {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-5 py-4 text-brand-text">{column.render ? column.render(row) : row[column.key]}</td>)}
                {actions ? <td className="whitespace-nowrap px-5 py-4">{actions(row)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && !visibleRows.length ? <div className="p-8 text-center text-brand-muted">{emptyText}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border p-4 text-sm text-brand-muted sm:p-5">
        <span>{visibleRows.length} records</span>
        <div className="flex items-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-full border border-brand-border px-3 py-1 disabled:opacity-40">Prev</button>
          <span>{page} / {pages}</span>
          <button disabled={page === pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="rounded-full border border-brand-border px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </motion.section>
  );
}
