import { apiRequest } from "./client";

const PREFIX = "/api/v1/invoices";

export async function listInvoices() {
  const { data } = await apiRequest(PREFIX, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function createInvoice(body) {
  const { data } = await apiRequest(PREFIX, {
    method: "POST",
    json: body,
  });
  return data;
}

export async function updateInvoice(invoiceUuid, body) {
  const { data } = await apiRequest(`${PREFIX}/${encodeURIComponent(invoiceUuid)}`, {
    method: "PATCH",
    json: body,
  });
  return data;
}

export async function updateInvoiceStatus(invoiceUuid, status) {
  const { data } = await apiRequest(
    `${PREFIX}/${encodeURIComponent(invoiceUuid)}/status`,
    {
      method: "PATCH",
      json: { status },
    },
  );
  return data;
}

export async function sendInvoice(invoiceUuid) {
  const { data } = await apiRequest(`${PREFIX}/${encodeURIComponent(invoiceUuid)}/send`, {
    method: "POST",
    json: {},
  });
  return data;
}
