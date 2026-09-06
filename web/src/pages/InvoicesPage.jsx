import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import * as invoicesApi from "../api/invoices";
import ConfirmDialog from "../components/ConfirmDialog";
import InvoiceFormModal from "../components/invoices/InvoiceFormModal";
import InvoiceStatusPill from "../components/invoices/InvoiceStatusPill";
import { AlertBanner, PageShell, Panel } from "../components/page/PageLayout";
import { useAuth } from "../hooks/useAuth";

function emptyForm() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    invoice_number: "",
    issue_date: today,
    due_date: "",
    currency: "USD",
    seller_name: "",
    seller_email: "",
    seller_vat_id: "",
    seller_address: "",
    buyer_name: "",
    buyer_email: "",
    buyer_vat_id: "",
    buyer_address: "",
    notes: "",
    items: [{ description: "", unit_type: "quantity", quantity: "1", unit_price: "0", tax_percent: "0" }],
  };
}

export default function InvoicesPage() {
  const { isAuthenticated, hasPermission } = useAuth();
  const canRead = hasPermission("invoice.read");
  const canCreate = hasPermission("invoice.create");
  const canUpdate = hasPermission("invoice.update");
  const canSend = hasPermission("invoice.send");

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [sendingUuid, setSendingUuid] = useState(null);
  const [sendConfirmUuid, setSendConfirmUuid] = useState(null);

  const showWorkspace = canRead || canCreate;

  const totalLabel = useMemo(() => {
    const total = invoices.length;
    return `${total} ${total === 1 ? "invoice" : "invoices"}`;
  }, [invoices]);

  const load = useCallback(async () => {
    if (!isAuthenticated || !canRead) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      const list = await invoicesApi.listInvoices();
      setInvoices(list);
    } catch (e) {
      setBanner({ type: "error", text: e instanceof ApiError ? e.message : "Could not load invoices." });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, canRead]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setModalMode("create");
    setEditingInvoice(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(invoice) {
    setModalMode("edit");
    setEditingInvoice(invoice);
    setForm({
      invoice_number: invoice.invoice_number ?? "",
      issue_date: invoice.issue_date ?? "",
      due_date: invoice.due_date ?? "",
      currency: invoice.currency ?? "USD",
      seller_name: invoice.seller_name ?? "",
      seller_email: invoice.seller_email ?? "",
      seller_vat_id: invoice.seller_vat_id ?? "",
      seller_address: invoice.seller_address ?? "",
      buyer_name: invoice.buyer_name ?? "",
      buyer_email: invoice.buyer_email ?? "",
      buyer_vat_id: invoice.buyer_vat_id ?? "",
      buyer_address: invoice.buyer_address ?? "",
      notes: invoice.notes ?? "",
      items: (invoice.items ?? []).map((item) => ({
        description: item.description ?? "",
        unit_type: item.unit_type ?? "quantity",
        quantity: String(item.quantity ?? "1"),
        unit_price: String(item.unit_price ?? "0"),
        tax_percent: String(item.tax_percent ?? "0"),
      })),
    });
    if (!invoice.items || invoice.items.length === 0) {
      setForm((prev) => ({ ...prev, items: [{ description: "", unit_type: "quantity", quantity: "1", unit_price: "0", tax_percent: "0" }] }));
    }
    setModalOpen(true);
  }

  async function submitForm(e) {
    e.preventDefault();
    if (!isAuthenticated) return;
    setSaving(true);
    setBanner(null);
    const payload = {
      ...form,
      items: (form.items ?? []).map((item) => ({
        description: item.description,
        unit_type: item.unit_type || "quantity",
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        tax_percent: Number(item.tax_percent || 0),
      })),
    };

    try {
      const response = modalMode === "edit" && editingInvoice
        ? await invoicesApi.updateInvoice(editingInvoice.uuid, payload)
        : await invoicesApi.createInvoice(payload);
      setBanner({ type: "ok", text: response.message || "Invoice saved successfully." });
      setModalOpen(false);
      await load();
    } catch (e) {
      setBanner({ type: "error", text: e instanceof ApiError ? e.message : "Could not save invoice." });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(invoiceUuid, status) {
    if (!isAuthenticated || !canUpdate) return;
    setBanner(null);
    try {
      const response = await invoicesApi.updateInvoiceStatus(invoiceUuid, status);
      setBanner({ type: "ok", text: response.message || "Invoice status updated." });
      await load();
    } catch (e) {
      setBanner({ type: "error", text: e instanceof ApiError ? e.message : "Could not update status." });
    }
  }

  async function confirmSend() {
    if (!isAuthenticated || !sendConfirmUuid || !canSend) return;
    setSendingUuid(sendConfirmUuid);
    setBanner(null);
    try {
      const response = await invoicesApi.sendInvoice(sendConfirmUuid);
      setBanner({ type: "ok", text: response.message || "Invoice sent successfully." });
      await load();
    } catch (e) {
      setBanner({ type: "error", text: e instanceof ApiError ? e.message : "Could not send invoice." });
      throw e;
    } finally {
      setSendingUuid(null);
    }
  }

  return (
    <>
      <PageShell>
        <AlertBanner banner={banner} onDismiss={() => setBanner(null)} />
        {loading && showWorkspace ? (
          <Panel className="animate-pulse">
            <div className="h-6 w-56 rounded-lg" style={{ backgroundColor: "var(--color-border)" }} />
            <div className="mt-6 space-y-3">
              <div className="h-24 rounded-[20px]" style={{ backgroundColor: "var(--color-surface-muted)" }} />
              <div className="h-24 rounded-[20px]" style={{ backgroundColor: "var(--color-surface-muted)" }} />
            </div>
          </Panel>
        ) : !showWorkspace ? (
          <Panel>
            <p className="text-body leading-relaxed" style={{ color: "var(--color-txt-secondary)" }}>
              You do not have permission to view or create invoices.
            </p>
          </Panel>
        ) : (
          <div className={`grid grid-cols-1 gap-6 ${canRead && canCreate ? "lg:grid-cols-12" : "lg:grid-cols-1"}`}>
            {canRead ? (
              <section className={canCreate ? "lg:col-span-8" : "lg:col-span-12"}>
                <Panel>
                  <header
                    className="flex flex-wrap items-end justify-between gap-3 border-b pb-5"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <div>
                      <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                        Invoices
                      </h2>
                      <p className="mt-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
                        Manage your invoices and sending status.
                      </p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-caption font-medium"
                      style={{
                        backgroundColor: "var(--color-accent-purple-soft)",
                        color: "var(--color-accent-purple)",
                      }}
                    >
                      {totalLabel}
                    </span>
                  </header>
                  <div className="mt-6 flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-1">
                    {invoices.length === 0 ? (
                      <p className="py-14 text-center text-body" style={{ color: "var(--color-txt-secondary)" }}>
                        {canCreate ? "No invoices yet — create your first one." : "No invoices available."}
                      </p>
                    ) : (
                      invoices.map((invoice) => (
                        <div
                          key={invoice.uuid}
                          className="rounded-xl border px-4 py-3"
                          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-muted)" }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>
                                  #{invoice.invoice_number}
                                </p>
                                <InvoiceStatusPill status={invoice.status} />
                              </div>
                              <p className="text-caption" style={{ color: "var(--color-txt-secondary)" }}>
                                {invoice.buyer_name || "Customer"} · {Number(invoice.total_amount ?? 0).toFixed(2)} {invoice.currency}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              {canUpdate ? (
                                <button
                                  type="button"
                                  className="rounded-lg px-3 py-1.5 text-caption font-medium"
                                  style={{ backgroundColor: "var(--color-accent-purple-soft)", color: "var(--color-accent-purple)" }}
                                  onClick={() => openEdit(invoice)}
                                >
                                  Edit
                                </button>
                              ) : null}
                              {canUpdate ? (
                                <select
                                  value={invoice.status}
                                  onChange={(e) => void changeStatus(invoice.uuid, e.target.value)}
                                  className="rounded-lg px-2 py-1.5 text-caption font-medium outline-none"
                                  style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-txt-primary)" }}
                                >
                                  <option value="draft">Draft</option>
                                  <option value="sent">Sent</option>
                                  <option value="paid">Paid</option>
                                </select>
                              ) : null}
                              {canSend ? (
                                <button
                                  type="button"
                                  className="rounded-lg px-3 py-1.5 text-caption font-medium"
                                  style={{ backgroundColor: "rgba(34,197,94,0.14)", color: "rgb(22,163,74)" }}
                                  onClick={() => setSendConfirmUuid(invoice.uuid)}
                                  disabled={sendingUuid === invoice.uuid}
                                >
                                  {sendingUuid === invoice.uuid ? "Sending..." : "Send"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>
              </section>
            ) : null}

            {canCreate ? (
              <section className={canRead ? "lg:col-span-4" : "lg:col-span-12 max-w-xl"}>
                <Panel>
                  <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                    New invoice
                  </h2>
                  <p className="mb-6 mt-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
                    Open the form modal to create an invoice.
                  </p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="w-full rounded-xl px-4 py-2.5 text-body font-medium"
                    style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
                  >
                    Create invoice
                  </button>
                </Panel>
              </section>
            ) : null}
          </div>
        )}
      </PageShell>

      <InvoiceFormModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        setForm={setForm}
        onClose={() => setModalOpen(false)}
        onSubmit={submitForm}
        saving={saving}
      />

      <ConfirmDialog
        open={!!sendConfirmUuid}
        onClose={() => setSendConfirmUuid(null)}
        title="Send this invoice?"
        description="A PDF will be generated and sent to the customer with a copy to your own email."
        confirmLabel="Send invoice"
        pendingLabel="Sending..."
        onConfirm={confirmSend}
      />
    </>
  );
}
