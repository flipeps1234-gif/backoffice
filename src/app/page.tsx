import InvoiceBuilder from "./invoice-builder";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="text-lg font-semibold tracking-tight mb-8">
        Invoice builder
      </h1>
      <InvoiceBuilder />
    </main>
  );
}
