"use client";

import dynamic from "next/dynamic";
import { MatrixSkeleton } from "./skeleton";

/** The grid and its code load after first paint; the skeleton holds its place. */
export const MatrixLazy = dynamic(() => import("./permission-matrix"), {
  ssr: false,
  loading: () => <MatrixSkeleton />,
});
