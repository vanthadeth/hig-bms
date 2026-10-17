import { requirePermission } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { PageHeader } from "@/components/ui";
import { RoleForm } from "../role-form";
import { createRole } from "../actions";

export const metadata = { title: "New role" };

export default async function NewRolePage() {
  await requirePermission("admin.roles", "create");
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("roles.new")} back={{ href: "/roles", label: t("roles.title") }} />
      <RoleForm mode="create" action={createRole} />
    </>
  );
}
