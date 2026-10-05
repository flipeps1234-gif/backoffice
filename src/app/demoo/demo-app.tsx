"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Mark from "../mark";
import { formatCents } from "@/lib/transaction";
import {
  BASE_IN,
  BASE_OUT,
  CLIENTS,
  DEMO_TODAY,
  ENTRIES,
  PENDING,
  PRODUCTS,
  SALES,
  newId,
  type Client,
  type Entry,
  type Pending,
  type Product,
  type Sale,
} from "./data";
import ClientsScreen from "./clients-screen";
import DashboardScreen, { type OwedRow, type ServiceTotal } from "./dashboard-screen";
import ExpenseScreen, { type ExpenseDraft } from "./expense-screen";
import HistoryScreen from "./history-screen";
import OwedScreen from "./owed-screen";
import ProductsScreen from "./products-screen";
import SaleScreen, { type SaleDraft } from "./sale-screen";
import UploadScreen from "./upload-screen";
import { Icon, card, primaryBtn, secondaryBtn } from "./ui";

type Section =
  | "Dashboard"
  | "Upload screenshots"
  | "Log sale"
  | "Log expense"
  | "Owed"
  | "Clients"
  | "Products and services"
  | "History"
  | "Settings";

/** The desktop sidebar's order, unchanged. */
const NAV: Section[] = [
  "Dashboard",
  "Log sale",
  "Log expense",
  "Owed",
  "Clients",
  "Products and services",
  "History",
];

const sumCents = (xs: { cents: number }[]) => xs.reduce((t, x) => t + x.cents, 0);

function ToCheck({ count }: { count: number }) {
  return (
    <>
      <span aria-hidden="true" className="rounded-full bg-amber-400 px-1.5 text-xs font-bold text-black tabular-nums">
        {count}
      </span>
      <span className="sr-only">
        {count} {count === 1 ? "payment" : "payments"} to check
      </span>
    </>
  );
}

export default function DemoApp() {
  const [section, setSection] = useState<Section>("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>(CLIENTS);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [entries, setEntries] = useState<Entry[]>(ENTRIES);
  const [sales, setSales] = useState<Sale[]>(SALES);
  const [pending, setPending] = useState<Pending[]>(PENDING);
  const [saleFor, setSaleFor] = useState<{ clientId: string | null; n: number }>({ clientId: null, n: 0 });
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ n: number; text: string } | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  // The menu is modal: the page behind it must not scroll, focus starts
  // on its Close button, and goes back to the menu button when it shuts —
  // from the cleanup, because the banner is inert until that render.
  useEffect(() => {
    if (!menuOpen) return;
    const before = document.body.style.overflow;
    const opener = menuButton.current;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = before;
      opener?.focus();
    };
  }, [menuOpen]);

  const say = (text: string) => setFlash((f) => ({ n: (f?.n ?? 0) + 1, text }));
  const closeMenu = () => setMenuOpen(false);
  const go = (s: Section) => {
    if (s === "Log sale") setSaleFor((v) => ({ clientId: null, n: v.n + 1 }));
    if (s === "Clients") setSelectedClient(null);
    setSection(s);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? null;

  /* ---------- derived totals ---------- */
  const september = (dir: "in" | "out") =>
    sumCents(entries.filter((e) => e.dir === dir && e.business && e.date.startsWith("2026-09")));
  const inCents = [...BASE_IN, september("in")];
  const outCents = [...BASE_OUT, september("out")];
  const owedSales = sales.filter((s) => s.status === "owed").sort((a, b) => a.date.localeCompare(b.date));
  const owedCents = owedSales.reduce((t, s) => t + s.totalCents, 0);
  const owedRows: OwedRow[] = owedSales.map((s) => ({
    id: s.id,
    name: clientName(s.clientId) ?? "No client",
    date: s.date,
    cents: s.totalCents,
  }));

  const paidLines = sales.filter((s) => s.status !== "owed").flatMap((s) => s.lines);
  const services: ServiceTotal[] = products.map((p) => {
    const fromEntries = entries.filter((e) => e.dir === "in" && e.productId === p.id);
    const fromSales = paidLines.filter((l) => l.productId === p.id);
    return {
      id: p.id,
      name: p.name,
      cents: p.baseCents + sumCents(fromEntries) + sumCents(fromSales),
      jobs: p.baseJobs + fromEntries.length + fromSales.length,
    };
  });

  /* ---------- actions ---------- */
  function logSale(d: SaleDraft) {
    let clientId = d.clientId;
    if (d.newClientName) {
      clientId = newId("c");
      const fresh: Client = { id: clientId, name: d.newClientName, notes: "", miles: null, recurring: null, basePaidCents: 0 };
      setClients((cs) => [fresh, ...cs]);
    }
    const name = d.newClientName ?? clientName(clientId);
    const total = d.lines.reduce((t, l) => t + l.cents, 0);
    setSales((ss) => [...ss, { id: newId("sale"), clientId, date: d.date, lines: d.lines, totalCents: total, status: d.paid }]);
    if (d.paid === "cash") {
      setEntries((es) => [
        ...es,
        {
          id: newId("e"),
          date: d.date,
          dir: "in",
          cents: total,
          name: name ?? "No name",
          what: d.lines.map((l) => l.label).join(", "),
          source: "cash",
          business: true,
          clientId: clientId ?? undefined,
        },
      ]);
      say(`${formatCents(total)} — paid, done.`);
    } else if (d.paid === "waiting") {
      say(`Marked paid — in the app it matches ${name ?? "the payment"} in your next screenshots.`);
    } else {
      say(`Saved — ${name ?? "someone"} owes ${formatCents(total)}.`);
    }
  }

  function markPaid(saleId: string, how: "cash" | "waiting") {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    setSales((ss) => ss.map((s) => (s.id === saleId ? { ...s, status: how } : s)));
    if (how === "cash") {
      setEntries((es) => [
        ...es,
        {
          id: newId("e"),
          date: DEMO_TODAY,
          dir: "in",
          cents: sale.totalCents,
          name: clientName(sale.clientId) ?? "No name",
          what: sale.lines.map((l) => l.label).join(", "),
          source: "cash",
          business: true,
          clientId: sale.clientId ?? undefined,
        },
      ]);
      say(`${formatCents(sale.totalCents)} — paid, done.`);
    } else {
      say("Marked paid — we’ll match it in your next screenshots.");
    }
  }

  function logExpense(d: ExpenseDraft) {
    setEntries((es) => [
      ...es,
      {
        id: newId("e"),
        date: d.date,
        dir: "out",
        cents: d.cents,
        name: d.where || d.category || "Expense",
        what: d.category || "No category",
        source: "cash",
        business: d.business,
      },
    ]);
    say(`−${formatCents(d.cents)} logged${d.business ? "" : " as personal"}.`);
  }

  function checkPayment(id: string, business: boolean) {
    const p = pending.find((x) => x.id === id);
    if (!p) return;
    setPending((ps) => ps.filter((x) => x.id !== id));
    setEntries((es) => [
      ...es,
      {
        id: newId("e"),
        date: p.date,
        dir: p.dir,
        cents: p.cents,
        name: p.name,
        what: p.what,
        source: "screenshot",
        business,
        // A personal payment is not a job: it must not count for the
        // client or the product.
        clientId: business ? p.clientId : undefined,
        productId: business ? p.productId : undefined,
      },
    ]);
    const amount = `${p.dir === "in" ? "+" : "−"}${formatCents(p.cents)}`;
    say(business ? `${amount} from ${p.app} kept as business.` : `${amount} kept as personal — out of the business totals.`);
  }

  function addProduct(p: { name: string; unit: Product["unit"]; priceCents: number; costCents: number }) {
    setProducts((ps) => [...ps, { id: newId("p"), ...p, baseJobs: 0, baseCents: 0 }]);
    say(`“${p.name}” added. It’s ready on Log sale.`);
  }

  const recentExpenses = entries
    .filter((e) => e.dir === "out")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  /* ---------- screens ---------- */
  let screen: ReactNode;
  switch (section) {
    case "Dashboard":
      screen = (
        <DashboardScreen
          inCents={inCents}
          outCents={outCents}
          owed={owedRows}
          owedCents={owedCents}
          toCheck={pending.length}
          onUpload={() => go("Upload screenshots")}
          onSale={() => go("Log sale")}
          onExpense={() => go("Log expense")}
          onOwed={() => go("Owed")}
        />
      );
      break;
    case "Upload screenshots":
      screen = <UploadScreen pending={pending} onCheck={checkPayment} />;
      break;
    case "Log sale":
      screen = (
        <SaleScreen
          key={`${saleFor.clientId}-${saleFor.n}`}
          clients={clients}
          products={products}
          initialClientId={saleFor.clientId}
          onSave={logSale}
        />
      );
      break;
    case "Log expense":
      screen = <ExpenseScreen recent={recentExpenses} onSave={logExpense} />;
      break;
    case "Owed":
      screen = (
        <OwedScreen
          sales={sales}
          clients={clients}
          onPaid={markPaid}
          onClient={(id) => {
            go("Clients");
            setSelectedClient(id);
          }}
        />
      );
      break;
    case "Clients":
      screen = (
        <ClientsScreen
          clients={clients}
          entries={entries}
          sales={sales}
          selectedId={selectedClient}
          onSelect={(id) => {
            setSelectedClient(id);
            window.scrollTo({ top: 0 });
          }}
          onLogSale={(id) => {
            go("Log sale");
            setSaleFor((s) => ({ clientId: id, n: s.n + 1 }));
          }}
          onNotes={(id, notes) => {
            setClients((cs) => cs.map((c) => (c.id === id ? { ...c, notes } : c)));
            say("Notes saved.");
          }}
        />
      );
      break;
    case "Products and services":
      screen = <ProductsScreen products={products} totals={services} onAdd={addProduct} />;
      break;
    case "History":
      screen = <HistoryScreen entries={entries} />;
      break;
    default:
      screen = (
        <section className={`${card} flex flex-col items-start gap-3 p-5`}>
          <h1 className="text-2xl font-semibold tracking-tight">{section}</h1>
          <p className="text-sm text-[#525252]">This demo doesn’t include settings. They work today in the app.</p>
          <div className="flex flex-wrap gap-2">
            <a href="/app" className={primaryBtn}>
              Open the app
            </a>
            <button type="button" onClick={() => go("Dashboard")} className={secondaryBtn}>
              Back to the dashboard
            </button>
          </div>
        </section>
      );
  }

  const navItem = (on: boolean) =>
    `flex min-h-[46px] w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] transition-colors ${
      on ? "bg-[#ededed] font-semibold text-black" : "text-neutral-400 hover:bg-neutral-900 hover:text-[#ededed]"
    }`;

  return (
    // A phone's width at any window size: on a laptop the app sits as one
    // column in the middle of a darker page.
    <div className="min-h-screen w-full bg-neutral-400">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-neutral-200 text-neutral-900">
        <header
          inert={menuOpen}
          className="sticky top-0 z-30 flex h-14 flex-none items-center gap-1 bg-black pl-1.5 pr-4 text-[#ededed] [--background:#000]"
        >
          <button
            ref={menuButton}
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-neutral-900"
          >
            <Icon name="menu" className="h-6 w-6" />
          </button>
          <button type="button" onClick={() => go("Dashboard")} className="flex items-center gap-2.5 rounded-lg pr-2">
            <Mark className="h-[26px] w-[26px]" />
            <span className="text-xl font-semibold tracking-tight">contado</span>
          </button>
          {pending.length > 0 ? (
            <button
              type="button"
              onClick={() => go("Upload screenshots")}
              className="ml-auto flex min-h-11 items-center gap-2 px-1 text-[13px] text-neutral-400 hover:text-[#ededed]"
            >
              To check <ToCheck count={pending.length} />
            </button>
          ) : (
            <span className="ml-auto rounded-full border border-neutral-600 px-2 py-0.5 text-xs text-neutral-300">Demo</span>
          )}
        </header>

        <main inert={menuOpen} className="flex flex-1 flex-col gap-3 px-4 pb-24 pt-4">
          {screen}
          <p className="mt-auto pt-4 text-center text-xs text-[#525252]">
            A demo of the phone app we’re building. Sample data for a made-up cleaning business; anything you log
            resets when you reload.
          </p>
        </main>

        {/* Fixed, so it never shifts the page under a thumb when it appears
            or times out. */}
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-40 mx-auto flex w-full max-w-[430px] justify-center px-4">
          {flash && (
            <p
              key={flash.n}
              className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg"
            >
              <Icon name="check" className="h-4 w-4" />
              {flash.text}
            </p>
          )}
        </div>

        {menuOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-y-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 overflow-hidden"
            onKeyDown={(e) => {
              if (e.key === "Escape") closeMenu();
            }}
          >
            {/* The dimmed page is a way out for a pointer; keyboards have
                Close and Escape, so it stays out of the tab order. */}
            <div aria-hidden="true" className="absolute inset-0 bg-black/60" onClick={closeMenu} />
            <nav
              aria-label="Main"
              className="absolute inset-y-0 left-0 flex w-[304px] max-w-[85%] flex-col gap-4 overflow-y-auto border-r border-neutral-700 bg-black px-3.5 pb-6 pt-1.5 text-[#ededed] [--background:#000]"
            >
              <div className="flex items-center justify-between pl-2">
                <span className="flex items-center gap-2.5">
                  <Mark className="h-[26px] w-[26px]" />
                  <span className="text-xl font-semibold tracking-tight">contado</span>
                </span>
                <button
                  ref={closeButton}
                  type="button"
                  aria-label="Close menu"
                  onClick={closeMenu}
                  className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-neutral-900"
                >
                  <Icon name="close" className="h-[22px] w-[22px]" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => go("Upload screenshots")}
                aria-current={section === "Upload screenshots" ? "page" : undefined}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-emerald-700 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                <Icon name="upload" className="h-5 w-5" />
                Upload screenshots
                {pending.length > 0 && <ToCheck count={pending.length} />}
              </button>
              <ul className="flex flex-col gap-0.5">
                {NAV.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => go(item)}
                      aria-current={section === item ? "page" : undefined}
                      className={navItem(section === item)}
                    >
                      <Icon name={item} className="h-5 w-5" />
                      <span className="flex-1">{item}</span>
                      {item === "Owed" && owedCents > 0 && (
                        <span role="img" aria-label="Money owed to you" className="h-2 w-2 rounded-full bg-amber-400" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => go("Settings")}
                  aria-current={section === "Settings" ? "page" : undefined}
                  className={navItem(section === "Settings")}
                >
                  <Icon name="Settings" className="h-5 w-5" />
                  <span className="flex-1">Settings</span>
                </button>
                <p className="border-t border-neutral-700 px-3 pt-3 text-[13px] text-neutral-400">
                  Demo — sample data, nothing is saved.
                </p>
              </div>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
