"use client";

import { ClassicFrame } from "../../app-frame";
import UploadScreen from "../../upload-screen";

/** /app/classic: the classic phone hub, at every width. */
export default function ClassicApp() {
  return (
    <ClassicFrame>
      <UploadScreen returnTo="/app/classic" />
    </ClassicFrame>
  );
}
