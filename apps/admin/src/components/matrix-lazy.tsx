"use client";

import dynamic from "next/dynamic";
import { MatrixSkeleton } from "./skeleton";

/** The editor and its code load after first paint; the skeleton holds its place. */
export const PermissionEditorLazy = dynamic(() => import("./permission-editor"), {
  ssr: false,
  loading: () => <MatrixSkeleton />,
});
