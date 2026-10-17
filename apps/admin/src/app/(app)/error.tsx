"use client";

import { useT } from "@/i18n/client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <div className="card card-pad" role="alert" style={{ maxWidth: 480 }}>
      <span className="green-rule" style={{ marginTop: 0 }} />
      <h1 style={{ margin: "0 0 6px", fontSize: 22, lineHeight: 1.25, fontWeight: 650 }}>{t("common.error")}</h1>
      <button type="button" className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => reset()}>
        {t("common.retry")}
      </button>
    </div>
  );
}
