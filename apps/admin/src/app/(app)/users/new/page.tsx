import { requirePermission } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Card, PageHeader } from "@/components/ui";
import { UserForm } from "../user-form";
import { createUser } from "../actions";

export default async function NewUserPage() {
  await requirePermission("admin.users", "create");
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("users.new")} back={{ href: "/users", label: t("users.title") }} />
      <Card>
        <UserForm mode="create" action={createUser} />
      </Card>
    </>
  );
}
