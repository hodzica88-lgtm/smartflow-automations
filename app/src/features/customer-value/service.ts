import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

const MAX_AVERAGE_ORDER_VALUE_CENTS = 1_000_000_000;
const MAX_MONTHLY_VARNITO_COST_CENTS = 100_000_000;

export type CustomerValueSettings = {
  averageOrderValueCents: number | null;
  monthlyVarnitoCostCents: number | null;
};

type RawCustomerValueSettings = {
  average_order_value_cents: number | null;
  monthly_varnito_cost_cents: number | null;
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

export const parseEuroAmount = ({
  rawValue,
  label,
  required,
  maximumCents,
}: {
  rawValue: string;
  label: string;
  required: boolean;
  maximumCents: number;
}): ParsedEuroAmount => {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return required
      ? { ok: false, error: `${label} ist erforderlich.` }
      : { ok: true, cents: null };
  }

  const normalized = trimmed
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(",", ".");

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return {
      ok: false,
      error: `${label} muss ein positiver Euro-Betrag mit höchstens zwei Nachkommastellen sein.`,
    };
  }

  const euros = Number(normalized);
  const cents = Math.round(euros * 100);

  if (!Number.isFinite(euros) || cents < 1) {
    return { ok: false, error: `${label} muss größer als 0 Euro sein.` };
  }

  if (!Number.isSafeInteger(cents) || cents > maximumCents) {
    return { ok: false, error: `${label} ist zu hoch.` };
  }

  return { ok: true, cents };
};

export const parseAverageOrderValue = (rawValue: string) =>
  parseEuroAmount({
    rawValue,
    label: "Der durchschnittliche Auftragswert",
    required: true,
    maximumCents: MAX_AVERAGE_ORDER_VALUE_CENTS,
  });

export const parseMonthlyVarnitoCost = (rawValue: string) =>
  parseEuroAmount({
    rawValue,
    label: "Die monatlichen Varnito-Kosten",
    required: false,
    maximumCents: MAX_MONTHLY_VARNITO_COST_CENTS,
  });

export const getCustomerValueSettings = async (
  companyId: string,
): Promise<CustomerValueSettings> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("settings")
    .select("average_order_value_cents, monthly_varnito_cost_cents")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as RawCustomerValueSettings | null;

  return {
    averageOrderValueCents: toSafeIntegerOrNull(row?.average_order_value_cents),
    monthlyVarnitoCostCents: toSafeIntegerOrNull(row?.monthly_varnito_cost_cents),
  };
};

export const saveCustomerValueSettings = async ({
  companyId,
  averageOrderValueCents,
  monthlyVarnitoCostCents,
}: {
  companyId: string;
  averageOrderValueCents: number;
  monthlyVarnitoCostCents: number | null;
}) => {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("settings").upsert(
    {
      company_id: companyId,
      average_order_value_cents: averageOrderValueCents,
      monthly_varnito_cost_cents: monthlyVarnitoCostCents,
    },
    { onConflict: "company_id" },
  );

  if (error) {
    throw error;
  }
};
