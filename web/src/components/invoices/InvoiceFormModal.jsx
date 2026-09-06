import { useMemo } from "react";

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const CURRENCY_RATES_IN_USD = {
  USD: 1,
  EUR: 0.92,
  DKK: 6.9,
};

export default function InvoiceFormModal({
  open,
  mode,
  form,
  setForm,
  onClose,
  onSubmit,
  saving,
}) {
  const totals = useMemo(() => {
    const subtotal = (form.items ?? []).reduce((acc, item) => acc + toNumber(item.quantity) * toNumber(item.unit_price), 0);
    const tax = (form.items ?? []).reduce(
      (acc, item) => acc + toNumber(item.quantity) * toNumber(item.unit_price) * (toNumber(item.tax_percent) / 100),
      0,
    );
    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [form.items]);

  if (!open) return null;

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function convertUnitPrices(nextCurrency) {
    setForm((prev) => {
      const currentCurrency = prev.currency || "USD";
      if (currentCurrency === nextCurrency) return prev;
      const fromRate = CURRENCY_RATES_IN_USD[currentCurrency] ?? 1;
      const toRate = CURRENCY_RATES_IN_USD[nextCurrency] ?? 1;
      const convertedItems = (prev.items ?? []).map((item) => {
        const currentUnitPrice = toNumber(item.unit_price);
        const usdValue = currentUnitPrice / fromRate;
        const converted = usdValue * toRate;
        return { ...item, unit_price: converted.toFixed(2) };
      });
      return { ...prev, currency: nextCurrency, items: convertedItems };
    });
  }

  function updateItem(index, patch) {
    setForm((prev) => {
      const nextItems = [...(prev.items ?? [])];
      nextItems[index] = { ...nextItems[index], ...patch };
      return { ...prev, items: nextItems };
    });
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...(prev.items ?? []), { description: "", unit_type: "quantity", quantity: "1", unit_price: "0", tax_percent: "0" }],
    }));
  }

  function removeItem(index) {
    setForm((prev) => {
      const nextItems = [...(prev.items ?? [])];
      nextItems.splice(index, 1);
      return { ...prev, items: nextItems.length > 0 ? nextItems : [{ description: "", unit_type: "quantity", quantity: "1", unit_price: "0", tax_percent: "0" }] };
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="scrollbar-themed w-full max-h-[92vh] max-w-6xl overflow-y-auto rounded-[28px] p-6 md:p-8"
        style={{
          backgroundColor: "var(--color-card)",
          boxShadow: "var(--shadow-card)",
          border: "1px solid rgba(17,17,17,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
            {mode === "edit" ? "Edit invoice" : "New invoice"}
          </h2>
          <button
            type="button"
            className="icon-btn h-9 w-9"
            style={{ backgroundColor: "var(--color-surface-muted)", border: "1px solid var(--color-border)" }}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>No.</span>
              <input
                required
                value={form.invoice_number}
                onChange={(e) => updateField("invoice_number", e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-body outline-none"
                style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-txt-primary)" }}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>Issue date</span>
              <input
                type="date"
                value={form.issue_date}
                onChange={(e) => updateField("issue_date", e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-body outline-none"
                style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-txt-primary)" }}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>Due date</span>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => updateField("due_date", e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-body outline-none"
                style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-txt-primary)" }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>Seller</h3>
              <input value={form.seller_name} onChange={(e) => updateField("seller_name", e.target.value)} placeholder="Seller name" className="w-full rounded-xl px-3 py-2.5 text-body outline-none" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
              <input value={form.seller_email} onChange={(e) => updateField("seller_email", e.target.value)} placeholder="Seller email" className="w-full rounded-xl px-3 py-2.5 text-body outline-none" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
              <input value={form.seller_vat_id} onChange={(e) => updateField("seller_vat_id", e.target.value)} placeholder="VAT ID" className="w-full rounded-xl px-3 py-2.5 text-body outline-none" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
              <textarea value={form.seller_address} onChange={(e) => updateField("seller_address", e.target.value)} rows={3} placeholder="Address" className="w-full rounded-xl px-3 py-2.5 text-body outline-none" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
            </div>
            <div className="space-y-3">
              <h3 className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>Buyer</h3>
              <input value={form.buyer_name} onChange={(e) => updateField("buyer_name", e.target.value)} placeholder="Buyer name" className="w-full rounded-xl px-3 py-2.5 text-body outline-none" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
              <input required type="email" value={form.buyer_email} onChange={(e) => updateField("buyer_email", e.target.value)} placeholder="Buyer email" className="w-full rounded-xl px-3 py-2.5 text-body outline-none" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
              <input value={form.buyer_vat_id} onChange={(e) => updateField("buyer_vat_id", e.target.value)} placeholder="VAT ID" className="w-full rounded-xl px-3 py-2.5 text-body outline-none" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
              <textarea value={form.buyer_address} onChange={(e) => updateField("buyer_address", e.target.value)} rows={3} placeholder="Address" className="w-full rounded-xl px-3 py-2.5 text-body outline-none" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>Invoice items</h3>
              <button type="button" onClick={addItem} className="rounded-lg px-3 py-1.5 text-caption font-medium" style={{ backgroundColor: "var(--color-accent-purple-soft)", color: "var(--color-accent-purple)" }}>
                + Add item
              </button>
            </div>
            <div className="space-y-2">
              {(form.items ?? []).map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 rounded-xl border p-2" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-muted)" }}>
                  <input className="col-span-12 md:col-span-3 rounded-lg px-2 py-2 text-caption outline-none" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }} placeholder="Description" value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} />
                  <select className="col-span-4 md:col-span-2 rounded-lg px-2 py-2 text-caption outline-none" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }} value={item.unit_type ?? "quantity"} onChange={(e) => updateItem(index, { unit_type: e.target.value })}>
                    <option value="quantity">quantity</option>
                    <option value="hours">hours</option>
                  </select>
                  <input className="col-span-4 md:col-span-1 rounded-lg px-2 py-2 text-caption outline-none" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }} placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} />
                  <input className="col-span-4 md:col-span-2 rounded-lg px-2 py-2 text-caption outline-none" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }} placeholder="Unit price" value={item.unit_price} onChange={(e) => updateItem(index, { unit_price: e.target.value })} />
                  <input className="col-span-3 md:col-span-3 rounded-lg px-2 py-2 text-caption outline-none" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }} placeholder="Tax %" value={item.tax_percent} onChange={(e) => updateItem(index, { tax_percent: e.target.value })} />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="col-span-1 justify-self-end inline-flex h-9 w-9 items-center justify-center self-center rounded-lg border text-body font-semibold"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      borderColor: "var(--color-danger-border)",
                      color: "var(--color-danger-fg)",
                    }}
                    aria-label="Remove item"
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>Currency</span>
              <select value={form.currency} onChange={(e) => convertUnitPrices(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-body outline-none" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="DKK">DKK</option>
              </select>
            </label>
            <div className="rounded-xl border px-3 py-2.5 text-caption" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-muted)" }}>
              Subtotal: {totals.subtotal.toFixed(2)} {form.currency}
            </div>
            <div className="rounded-xl border px-3 py-2.5 text-caption font-semibold" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-muted)" }}>
              Total: {totals.total.toFixed(2)} {form.currency}
            </div>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>Notes</span>
            <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} className="w-full rounded-xl px-3 py-2.5 text-body outline-none" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
          </label>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-body font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-txt-primary)" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl px-4 py-2.5 text-body font-medium disabled:opacity-50" style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}>
              {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Create invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
