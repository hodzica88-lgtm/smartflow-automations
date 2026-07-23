import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

const MAX_AVERAGE_ORDER_VALUE_CENTS = 1_000_000_000;

export type CustomerValueSettings = {
  averageOrderValueCents: number | null;
};

type RawCustomerValueSettings = {
  average_order_value_cents: number | null;
};

export type ParsedEuroAmount =
  | { ok: true; cents: number | null }
  | { ok: false; error: string };

const toSafeIntegerOrNull = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isSafeInteger(value)) {
    return null;
  }

  return value;
};

export const parseAverageOrderValue = (rawValue: string): ParsedEuroAmount => {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return { ok: false, error: "Der durchschnittliche Auftragswert ist erforderlich." };
  }

  const normalized = trimmed
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(",", ".");

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return {
      ok: false,
      error: "Der durchschnittliche Auftragswert muss ein positiver Euro-Betrag mit höchstens zwei Nachkommastellen sein.",
    };
  }

  const euros = Number(normalized);
  const cents = Math.round(euros * 100);

  if (!Number.isFinite(euros) || cents < 1) {
    return {
      ok: false,
      error: "Der durchschnittliche Auftragswert muss größer als 0 Euro sein.",
    };
  }

  if (!Number.isSafeInteger(cents) || cents > MAX_AVERAGE_ORDER_VALUE_CENTS) {
    return { ok: false, error: "Der durchschnittliche Auftragswert ist zu hoch." };
  }

  return { ok: true, cents };
};

export const getCustomerValueSettings = async (
  companyId: string,
): Promise<CustomerValueSettings> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("settings")
    .select("average_order_value_cents")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as RawCustomerValueSettings | null;

  return {
    averageOrderValueCents: toSafeIntegerOrNull(row?.average_order_value_cents),
  };
};

export const saveAverageOrderValue = async ({
  companyId,
  averageOrderValueCents,
}: {
  companyId: string;
  averageOrderValueCents: number;
}) => {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("settings").upsert(
    {
      company_id: companyId,
      average_order_value_cents: averageOrderValueCents,
    },
    { onConflict: "company_id" },
  );

  if (error) {
    throw error;
  }
};
