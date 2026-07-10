import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import { getOwnerNotificationScheduledFor } from "@/shared/utils/businessHours";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
const RATE_LIMIT_MAX_SUBMISSIONS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MESSAGE =
  "Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es später erneut.";

const getString = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
};

const normalizeIpCandidate = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const first = value.split(",")[0]?.trim();
  if (!first) {
    return null;
  }

  // Accept plain IPv4/IPv6 values; reject hostnames and malformed tokens.
  if (first.length > 64 || !/^[0-9a-fA-F:.]+$/.test(first)) {
    return null;
  }

  return first;
};

const getClientIpForRateLimit = async () => {
  const requestHeaders = await headers();

  // Assumption: app is behind a trusted reverse proxy (e.g. Vercel/Netlify) that sets these headers.
  // We prioritize proxy-provided client IP headers and normalize aggressively.
  const prioritizedCandidates = [
    requestHeaders.get("cf-connecting-ip"),
    requestHeaders.get("x-real-ip"),
    requestHeaders.get("x-forwarded-for"),
  ];

  for (const candidate of prioritizedCandidates) {
    const normalized = normalizeIpCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return "127.0.0.1";
  }

  return null;
};

type PageProps = {
  params: Promise<{ companyId: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { companyId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const success = resolvedSearchParams?.success === "1";
  const error = resolvedSearchParams?.error ?? null;

  return (
    <div style={{maxWidth: 720, margin: '0 auto', padding: 24}}>
      <h1>Kontaktanfrage</h1>
      <p>Kurzes Formular — wir melden uns während unserer Geschäftszeiten.</p>

      {success ? (
        <div style={{padding:12, background:'#e6ffed', border:'1px solid #b7f0c6'}}>
          Vielen Dank! Ihre Anfrage wurde erfolgreich übermittelt. Wir melden uns während unserer Geschäftszeiten bei Ihnen.
        </div>
      ) : (
        <form action={async (formData: FormData) => {
          "use server";

          const companyIdValue = getString(formData, 'companyId');
          const first_name = getString(formData, 'first_name');
          const last_name = getString(formData, 'last_name');
          const address = getString(formData, 'address');
          const phone = getString(formData, 'phone');
          const email = getString(formData, 'email');
          const inquiry_type = getString(formData, 'inquiry_type');
          const description = getString(formData, 'description');
          const website = getString(formData, 'website');

          if (!companyIdValue) {
            redirect(`/c/${companyIdValue || companyId}/inquiry?error=${encodeURIComponent('Ungültige Firma.')}`);
          }

          if (website) {
            redirect(
              `/c/${companyIdValue || companyId}/inquiry?error=${encodeURIComponent(
                'Anfrage konnte nicht gesendet werden.'
              )}`
            );
          }

          if (!first_name || !last_name || !address || !phone || !email || !inquiry_type) {
            redirect(`/c/${companyIdValue || companyId}/inquiry?error=${encodeURIComponent('Bitte alle Pflichtfelder ausfüllen.')}`);
          }

          if (!isValidEmail(email)) {
            redirect(`/c/${companyIdValue || companyId}/inquiry?error=${encodeURIComponent('Bitte gültige E-Mail-Adresse angeben.')}`);
          }

          const supabase = createSupabaseServiceRoleClient();

          // Verify company exists and is not deleted
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('id, deleted_at, timezone, business_hours')
            .eq('id', companyIdValue)
            .maybeSingle();

          if (companyError || !company || company.deleted_at) {
            redirect(`/c/${companyIdValue || companyId}/inquiry?error=${encodeURIComponent('Firma nicht gefunden.')}`);
          }

          const clientIp = await getClientIpForRateLimit();

          if (!clientIp) {
            redirect(
              `/c/${companyIdValue || companyId}/inquiry?error=${encodeURIComponent(
                'Anfrage konnte nicht gesendet werden.'
              )}`
            );
          }

          const { data: rateLimitData, error: rateLimitError } = await supabase.rpc(
            'check_and_record_inquiry_rate_limit',
            {
              p_company_id: companyIdValue,
              p_client_ip: clientIp,
              p_max_submissions: RATE_LIMIT_MAX_SUBMISSIONS,
              p_window_minutes: RATE_LIMIT_WINDOW_MINUTES,
            }
          );

          if (rateLimitError) {
            redirect(
              `/c/${companyIdValue || companyId}/inquiry?error=${encodeURIComponent(
                'Anfrage konnte nicht gesendet werden.'
              )}`
            );
          }

          const rateLimitAllowed =
            Array.isArray(rateLimitData) &&
            rateLimitData.length > 0 &&
            Boolean((rateLimitData[0] as { allowed?: unknown }).allowed);

          if (!rateLimitAllowed) {
            redirect(
              `/c/${companyIdValue || companyId}/inquiry?error=${encodeURIComponent(
                RATE_LIMIT_MESSAGE
              )}`
            );
          }

            const { data: leadData, error: insertError } = await supabase.from('leads').insert({
              company_id: companyIdValue,
              first_name,
              last_name,
              address,
              phone,
              email,
              inquiry_type,
              source: 'public_form',
              status: 'new',
              notes: description || null,
            }).select('id').single();

            if (insertError || !leadData?.id) {
              redirect(
                `/c/${companyIdValue || companyId}/inquiry?error=${encodeURIComponent(
                  'Beim Speichern Ihrer Anfrage ist ein Fehler aufgetreten.'
                )}`
              );
            }

            const customerConfirmationScheduledFor = new Date().toISOString();
            const ownerNewLeadScheduledFor = getOwnerNotificationScheduledFor(
              company.timezone,
              company.business_hours,
            );

            const { error: queueError } = await supabase.from('notification_queue').insert([
              {
                company_id: companyIdValue,
                lead_id: leadData.id,
                notification_type: 'owner_new_lead',
                status: 'pending',
                scheduled_for: ownerNewLeadScheduledFor,
              },
              {
                company_id: companyIdValue,
                lead_id: leadData.id,
                notification_type: 'customer_confirmation',
                status: 'pending',
                scheduled_for: customerConfirmationScheduledFor,
              },
            ]);

            if (queueError) {
              redirect(
                `/c/${companyIdValue || companyId}/inquiry?error=${encodeURIComponent(
                  'Beim Planen der Benachrichtigungen ist ein Fehler aufgetreten.'
                )}`
              );
            }

            redirect(`/c/${companyIdValue || companyId}/inquiry?success=1`);
        }}>
          <input type="hidden" name="companyId" value={companyId} />
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          />

          <div style={{display:'grid', gap:12}}>
            <label>
              Vorname (Pflicht)
              <input name="first_name" required />
            </label>

            <label>
              Nachname (Pflicht)
              <input name="last_name" required />
            </label>

            <label>
              Adresse (Pflicht)
              <input name="address" required />
            </label>

            <label>
              Telefon (Pflicht)
              <input name="phone" required />
            </label>

            <label>
              E-Mail (Pflicht)
              <input name="email" type="email" required />
            </label>

            <label>
              Anfrage-Typ (Pflicht)
              <select name="inquiry_type" required defaultValue="">
                <option value="" disabled>Bitte wählen</option>
                <option value="Reparatur">Reparatur</option>
                <option value="Wartung">Wartung</option>
                <option value="Installation">Installation</option>
                <option value="Reinigung">Reinigung</option>
                <option value="Beratung">Beratung</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </label>

            <label>
              Beschreibung (optional)
              <textarea name="description" rows={4} />
            </label>

            {error ? <div style={{color:'red'}}>{error}</div> : null}

            <button type="submit">Anfrage senden</button>
          </div>
        </form>
      )}
    </div>
  );
}
