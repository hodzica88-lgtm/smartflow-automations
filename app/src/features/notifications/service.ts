import { unstable_cache } from "next/cache";
import { cache } from "react";

import { isVisibleOwnerBusinessNotification } from "@/features/operator/internal-company";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export const APP_NOTIFICATION_TYPES = [
  "new_inquiry",
  "team_invited",
  "invite_accepted",
  "trial_ends_7_days",
  "trial_ends_tomorrow",
  "payment_failed",
  "subscription_canceled",
  "subscription_reactivated",
] as const;

export type AppNotificationType = (typeof APP_NOTIFICATION_TYPES)[number];

export type AppNotification = {
  id: string;
  company_id: string;
  actor_user_id: string | null;
  type: AppNotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

type CreateAppNotificationInput = {
  companyId: string;
  actorUserId?: string | null;
  type: AppNotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
};

const toNotificationType = (value: string): AppNotificationType => {
  if ((APP_NOTIFICATION_TYPES as readonly string[]).includes(value)) {
    return value as AppNotificationType;
  }

  return "new_inquiry";
};

export const createAppNotification = async (input: CreateAppNotificationInput) => {
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase
    .from("app_notifications")
    .insert({
      actor_user_id: input.actorUserId ?? null,
      company_id: input.companyId,
      dedupe_key: input.dedupeKey ?? null,
      message: input.message,
      metadata: input.metadata ?? {},
      title: input.title,
      type: input.type,
    });

  if (error) {
    const details = String(error.message ?? "").toLowerCase();
    if (details.includes("duplicate key")) {
      return;
    }
    throw error;
  }
};

export const listCompanyNotifications = async (companyId: string, limit = 50) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("app_notifications")
    .select("id, company_id, actor_user_id, type, title, message, metadata, is_read, read_at, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    company_id: String(row.company_id),
    actor_user_id: row.actor_user_id ? String(row.actor_user_id) : null,
    type: toNotificationType(String(row.type)),
    title: String(row.title),
    message: String(row.message),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    is_read: Boolean(row.is_read),
    read_at: row.read_at ? String(row.read_at) : null,
    created_at: String(row.created_at),
  })) as AppNotification[];
};

export const listOwnerBusinessNotifications = async (limit = 20) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("app_notifications")
    .select("id, company_id, actor_user_id, type, title, message, metadata, is_read, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit * 6);

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      id: String(row.id),
      company_id: row.company_id ? String(row.company_id) : "",
      actor_user_id: row.actor_user_id ? String(row.actor_user_id) : null,
      type: toNotificationType(String(row.type)),
      title: String(row.title),
      message: String(row.message),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      is_read: Boolean(row.is_read),
      read_at: row.read_at ? String(row.read_at) : null,
      created_at: String(row.created_at),
    }))
    .filter((entry) => isVisibleOwnerBusinessNotification({
      company_id: entry.company_id || null,
      created_at: entry.created_at,
    }))
    .slice(0, limit) as AppNotification[];
};

export const getOwnerBusinessNotificationCount = async () => {
  const notifications = await listOwnerBusinessNotifications(200);
  return notifications.length;
};

const loadCompanyUnreadNotificationCount = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { count, error } = await supabase
    .from("app_notifications")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("is_read", false);

  if (error) {
    throw error;
  }

  return count ?? 0;
};

const getSharedCompanyUnreadNotificationCount = unstable_cache(
  loadCompanyUnreadNotificationCount,
  ["company-unread-notification-count"],
  { revalidate: 3 },
);

export const getCompanyUnreadNotificationCount = cache((companyId: string) =>
  getSharedCompanyUnreadNotificationCount(companyId),
);

export const markNotificationRead = async (companyId: string, notificationId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("app_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", notificationId);

  if (error) {
    throw error;
  }
};

export const markAllNotificationsRead = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("app_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("is_read", false);

  if (error) {
    throw error;
  }
};