import UploadScreen from "./upload-screen";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="text-lg font-semibold tracking-tight mb-6">Ledger</h1>
      <UploadScreen />
    </main>
  );
}
