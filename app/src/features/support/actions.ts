"use server";

import { redirect } from "next/navigation";

import { requireOperatorUser } from "@/features/operator/access";
import { sendOwnerSupportReply, updateSupportThreadStatus } from "@/features/support/service";
import { getRequestMarket } from "@/shared/i18n/request";
import type { SupportThreadStatus } from "@/features/support/types";

const getString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export async function sendSupportReplyAction(formData: FormData) {
  const user = await requireOperatorUser();
  const threadId = getString(formData, "thread_id");
  const body = getString(formData, "body");
  const market = (await getRequestMarket()).market;

  if (!threadId || !body) {
    redirect(`/operator/support?error=${encodeURIComponent("Reply could not be sent.")}`);
  }

  const result = await sendOwnerSupportReply({
    threadId,
    actorEmail: user.email ?? "owner@varnito.com",
    body,
    market,
  });

  if (!result.sent) {
    redirect(`/operator/support/${threadId}?error=${encodeURIComponent(result.error ?? "Reply failed")}`);
  }

  redirect(`/operator/support/${threadId}?success=${encodeURIComponent("Reply sent")}`);
}

export async function updateSupportStatusAction(formData: FormData) {
  await requireOperatorUser();
  const threadId = getString(formData, "thread_id");
  const status = getString(formData, "status") as SupportThreadStatus;

  if (!threadId || !status) {
    redirect("/operator/support?error=Invalid+status");
  }

  await updateSupportThreadStatus({
    threadId,
    status,
    owner_email: (await requireOperatorUser()).email,
  });

  redirect(`/operator/support/${threadId}?success=${encodeURIComponent("Status updated")}`);
}
