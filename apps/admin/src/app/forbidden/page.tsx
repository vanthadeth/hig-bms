import Link from "next/link";
import { getT } from "@/i18n/server";

export default async function ForbiddenPage() {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">{t("common.forbidden")}</h1>
      <Link href="/" className="text-accent underline">
        {t("nav.dashboard")}
      </Link>
    </main>
  );
}
