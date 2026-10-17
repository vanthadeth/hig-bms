"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { Avatar, StatusPill } from "@/components/ui";
import { IconChevron, IconSearch } from "@/components/shell/icons";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  username: string;
  roles: string[];
  active: boolean;
  last: string;
};

type Filter = "all" | "active" | "inactive";

export function UserList({ users }: { users: UserRow[] }) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const deferredQ = useDeferredValue(q);

  const counts = useMemo(() => {
    const active = users.filter((u) => u.active).length;
    return { all: users.length, active, inactive: users.length - active };
  }, [users]);

  const rows = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "active" && !u.active) return false;
      if (filter === "inactive" && u.active) return false;
      return !needle || `${u.name} ${u.email} ${u.username}`.toLowerCase().includes(needle);
    });
  }, [users, deferredQ, filter]);

  if (!users.length) {
    return (
      <div className="card empty">
        <b>{t("users.empty")}</b>
      </div>
    );
  }

  return (
    <>
      <div className="stack" style={{ marginBottom: 14 }}>
        <div className="search">
          <IconSearch />
          <input
            className="input"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder={t("users.search")}
            aria-label={t("users.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="chips" role="group">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {t(`users.${f}` as const)}
              <span className="n">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div className="row-head" aria-hidden>
          <span>{t("users.name")}</span>
          <span>{t("users.roles")}</span>
          <span>{t("users.last")}</span>
          <span>{t("users.status")}</span>
        </div>
        {rows.length ? (
          <div className="rows">
            {rows.map((u) => (
              <Link key={u.id} href={`/users/${u.id}`} className="row">
                <div className="row-person">
                  <Avatar name={u.name} seed={u.id} />
                  <div className="row-main">
                    <b>{u.name}</b>
                    <span>{u.email}</span>
                  </div>
                </div>
                <div className="row-end">
                  <StatusPill active={u.active} activeLabel={t("common.active")} inactiveLabel={t("common.inactive")} />
                  <IconChevron className="chev" />
                </div>
                <div className="row-roles">
                  {u.roles.length ? u.roles.map((r) => <span key={r} className="pill">{r}</span>) : <span className="pill pill-off">{t("users.noRoles")}</span>}
                </div>
                <div className="row-meta">{u.last}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <b>{t("users.none")}</b>
            {t("users.noneHint")}
          </div>
        )}
      </div>
      <p style={{ color: "var(--fg-3)", fontSize: 14, margin: "10px 2px 0" }}>{t("users.showing", { n: rows.length, t: users.length })}</p>
    </>
  );
}
