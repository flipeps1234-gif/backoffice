import LocalePicker from "../locale-picker";
import Mark from "../mark";
import UploadScreen from "../upload-screen";

/**
 * The app itself, moved from / to /app when the landing page took the
 * root (public surface, 2026-08-16). Everything else is unchanged: the
 * sign-in gate, the demo word, and anonymous in-memory mode all live
 * inside UploadScreen exactly as before — a logged-out visitor here sees
 * the sign-in screen, which IS the app's front door.
 */
export default function AppPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 lg:max-w-5xl lg:px-8">
      {/* The picker lives in the permanent header — every screen, every
          state, including signed-out. A language switcher you have to hunt
          for might as well not exist. */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Mark />
          contado
        </h1>
        <LocalePicker compact />
      </div>
      <UploadScreen />
    </main>
  );
}
