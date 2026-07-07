import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

const getString = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
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

          if (!companyIdValue) {
            redirect(`/c/${companyIdValue || companyId}/inquiry?error=${encodeURIComponent('Ungültige Firma.')}`);
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
            .select('id, deleted_at')
            .eq('id', companyIdValue)
            .maybeSingle();

          if (companyError || !company || company.deleted_at) {
            redirect(`/c/${companyIdValue || companyId}/inquiry?error=${encodeURIComponent('Firma nicht gefunden.')}`);
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

            const scheduledFor = new Date().toISOString();
            // TODO: Use company timezone and business_hours parsing to delay notifications
            // until the next open business window once a parser is available.
            const { error: queueError } = await supabase.from('notification_queue').insert([
              {
                company_id: companyIdValue,
                lead_id: leadData.id,
                notification_type: 'owner_new_lead',
                status: 'pending',
                scheduled_for: scheduledFor,
              },
              {
                company_id: companyIdValue,
                lead_id: leadData.id,
                notification_type: 'customer_confirmation',
                status: 'pending',
                scheduled_for: scheduledFor,
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
