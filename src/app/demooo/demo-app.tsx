"use client";

import { useEffect, useState, type ReactNode } from "react";
import Mark from "../mark";
import { formatCents } from "@/lib/transaction";
import {
  BASE_IN,
  BASE_MILES,
  BASE_OUT,
  BASE_VISITS,
  CLIENTS,
  DEMO_TODAY,
  ENTRIES,
  PRODUCTS,
  SALES,
  newId,
  type Client,
  type Entry,
  type Product,
  type Sale,
} from "./data";
import ClientsScreen from "./clients-screen";
import DashboardScreen, { type ServiceTotal } from "./dashboard-screen";
import ExpenseScreen, { type ExpenseDraft } from "./expense-screen";
import HistoryScreen from "./history-screen";
import OwedScreen from "./owed-screen";
import ProductsScreen from "./products-screen";
import SaleScreen, { type SaleDraft } from "./sale-screen";
import { Icon, card, primaryBtn, secondaryBtn } from "./ui";

type Section =
  | "Dashboard"
  | "Log sale"
  | "Log expense"
  | "Owed"
  | "Clients"
  | "Products and services"
  | "History"
  | "Settings"
  | "Proof of income";

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

export default function DemoApp() {
  const [section, setSection] = useState<Section>("Dashboard");
  const [clients, setClients] = useState<Client[]>(CLIENTS);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [entries, setEntries] = useState<Entry[]>(ENTRIES);
  const [sales, setSales] = useState<Sale[]>(SALES);
  const [saleFor, setSaleFor] = useState<{ clientId: string | null; n: number }>({ clientId: null, n: 0 });
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ n: number; text: string } | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  const say = (text: string) => setFlash((f) => ({ n: (f?.n ?? 0) + 1, text }));
  const go = (s: Section) => {
    setSection(s);
    window.scrollTo({ top: 0 });
  };
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? null;

  /* ---------- derived totals ---------- */
  const september = (dir: "in" | "out") =>
    sumCents(entries.filter((e) => e.dir === dir && e.business && e.date.startsWith("2026-09")));
  const inCents = [...BASE_IN, september("in")];
  const outCents = [...BASE_OUT, september("out")];
  const owedCents = sales.filter((s) => s.status === "owed").reduce((t, s) => t + s.totalCents, 0);

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

  const newVisits = sales.filter((s) => s.id.startsWith("sale-") && s.clientId);
  const miles =
    BASE_MILES + newVisits.reduce((t, s) => t + (clients.find((c) => c.id === s.clientId)?.miles ?? 0), 0);
  const visits = BASE_VISITS + newVisits.length;

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
          owedCents={owedCents}
          services={services}
          miles={miles}
          visits={visits}
          onOwed={() => go("Owed")}
          onProof={() => go("Proof of income")}
        />
      );
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
            setSelectedClient(id);
            go("Clients");
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
          onSelect={setSelectedClient}
          onLogSale={(id) => {
            setSaleFor((s) => ({ clientId: id, n: s.n + 1 }));
            go("Log sale");
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
        <section className={`${card} flex flex-col items-start gap-3 p-6`}>
          <h1 className="text-2xl font-semibold tracking-tight">{section}</h1>
          <p className="text-sm text-[#525252]">This demo doesn’t include {section.toLowerCase()}. It works today in the app.</p>
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

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-200 text-neutral-900 lg:flex-row">
      <nav
        aria-label="Main"
        className="flex flex-none flex-col gap-4 bg-black px-3 py-4 text-[#ededed] [--background:#000] lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:gap-6 lg:px-3.5 lg:py-6"
      >
        <div className="flex items-center gap-2.5 px-2.5">
          <Mark className="h-[26px] w-[26px]" />
          <span className="text-xl font-semibold tracking-tight">contado</span>
          <span className="ml-auto rounded-full border border-neutral-600 px-2 py-0.5 text-xs text-neutral-300">Demo</span>
        </div>
        <ul className="-mx-3 flex gap-1 overflow-x-auto px-3 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
          {NAV.map((item) => {
            const on = section === item;
            return (
              <li key={item} className="flex-none">
                <button
                  type="button"
                  onClick={() => {
                    if (item === "Log sale") setSaleFor((s) => ({ clientId: null, n: s.n + 1 }));
                    go(item);
                  }}
                  aria-current={on ? "page" : undefined}
                  className={`flex h-10 w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 text-sm transition-colors ${
                    on ? "bg-[#ededed] font-semibold text-black" : "text-neutral-400 hover:bg-neutral-900 hover:text-[#ededed]"
                  }`}
                >
                  <Icon name={item} />
                  <span className="flex-1 text-left">{item}</span>
                  {item === "Owed" && owedCents > 0 && <span className="h-2 w-2 rounded-full bg-amber-400" />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto hidden flex-col gap-1 lg:flex">
          <a
            href="/app"
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#ededed] text-sm font-semibold text-black transition-colors hover:bg-white"
          >
            <Icon name="upload" />
            Upload screenshots
          </a>
          <button
            type="button"
            onClick={() => go("Settings")}
            className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
              section === "Settings" ? "bg-[#ededed] font-semibold text-black" : "text-neutral-400 hover:bg-neutral-900 hover:text-[#ededed]"
            }`}
          >
            <Icon name="Settings" />
            Settings
          </button>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-5 px-4 py-6 lg:px-9 lg:py-7">
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This is a demo of the desktop app we’re building. Every number is sample data for a made-up
          cleaning business, and anything you log here resets when you reload.
        </p>
        {/* Fixed, so it never shifts the page under the pointer when it
            appears or times out. */}
        <div aria-live="polite" className="fixed bottom-4 right-4 left-4 z-50 flex justify-end lg:left-auto">
          {flash && (
            <p
              key={flash.n}
              className="flex max-w-md items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            >
              <Icon name="check" className="h-4 w-4" />
              {flash.text}
            </p>
          )}
        </div>
        {screen}
      </main>
    </div>
  );
}
