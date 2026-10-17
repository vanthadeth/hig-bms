import { getCurrentUser, getPermissions } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Card, PageHeader } from "@/components/ui";

export default async function DashboardPage() {
  const [user, perms, { t }] = await Promise.all([getCurrentUser(), getPermissions(), getT()]);
  return (
    <>
      <PageHeader title={`${t("dash.welcome")}, ${user?.fullName ?? ""}`} />
      <Card title={t("dash.yourAccess")}>
        <p className="text-sm text-muted">{t("dash.allowed", { n: perms.size })}</p>
      </Card>
    </>
  );
}
