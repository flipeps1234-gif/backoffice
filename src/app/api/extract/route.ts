import { extract } from "@/lib/extract";
import type { ExtractionInput } from "@/lib/extract";

/**
 * Extraction runs here, not in the browser. When we plug in a real provider its
 * API key stays on the server.
 */

const MAX_FILES = 20;
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  // formData() throws outright when the body isn't multipart.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected an upload." }, { status: 400 });
  }

  const files = form.getAll("screenshots").filter((f) => f instanceof File);

  if (files.length === 0) {
    return Response.json({ error: "No screenshots uploaded." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return Response.json(
      { error: `That's more than ${MAX_FILES} screenshots at once.` },
      { status: 400 },
    );
  }

  const inputs: ExtractionInput[] = [];
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: `${file.name} is larger than 8MB.` },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    inputs.push({
      kind: "image",
      mediaType: file.type,
      base64: bytes.toString("base64"),
      filename: file.name,
    });
  }

  try {
    return Response.json(await extract(inputs));
  } catch (cause) {
    // Never fail silently — log the real reason, show the user a usable one.
    console.error("Extraction failed:", cause);
    return Response.json(
      { error: "We couldn't read those right now. Try again in a moment." },
      { status: 502 },
    );
  }
}
