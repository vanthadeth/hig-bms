import Link from "next/link";
import { getT } from "@/i18n/server";
import { Logo } from "@/components/logo";

export const metadata = { title: "No access" };

export default async function ForbiddenPage() {
  const { t } = await getT();
  return (
    <main className="center-screen">
      <div className="card auth-card">
        <Logo size={56} />
        <span className="green-rule" />
        <h1 style={{ margin: "0 0 6px", fontSize: 24, lineHeight: 1.25, fontWeight: 650 }}>{t("common.forbidden")}</h1>
        <Link href="/" className="btn btn-primary btn-block" style={{ marginTop: 18 }}>
          {t("nav.home")}
        </Link>
      </div>
    </main>
  );
}
