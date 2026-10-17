import { requirePermission } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Card, PageHeader } from "@/components/ui";
import { RoleForm } from "../role-form";
import { createRole } from "../actions";

export default async function NewRolePage() {
  await requirePermission("admin.roles", "create");
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("roles.new")} back={{ href: "/roles", label: t("roles.title") }} />
      <Card>
        <RoleForm mode="create" action={createRole} />
      </Card>
    </>
  );
}
