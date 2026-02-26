const SUPPORT_TICKETS_URL =
  "https://banking-api-46469170160.asia-southeast1.run.app/support/tickets";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | string;

type SupportTicket = {
  ticket_id: string;
  issue_type: string;
  txn_uuid: string;
  amount: number;
  txn_time: string;
  masked_destination: string;
  bankbiller_name: string;
  summary: string;
  status: TicketStatus;
  opened_at: string;
  account_id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
};

type TicketsApiResponse = {
  status: string;
  data: SupportTicket[];
  paging?: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
};

function formatAmount(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(parsed);
}

function statusClasses(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "IN_PROGRESS":
      return "bg-sky-100 text-sky-800 border border-sky-200";
    case "RESOLVED":
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    case "CLOSED":
      return "bg-zinc-200 text-zinc-800 border border-zinc-300";
    default:
      return "bg-zinc-100 text-zinc-700 border border-zinc-200";
  }
}

async function getTickets(): Promise<TicketsApiResponse> {
  const response = await fetch(SUPPORT_TICKETS_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tickets: ${response.status}`);
  }

  return (await response.json()) as TicketsApiResponse;
}

export default async function SupportPage() {
  let tickets: SupportTicket[] = [];
  let total = 0;
  let errorMessage = "";

  try {
    const payload = await getTickets();
    tickets = payload.data ?? [];
    total = payload.paging?.total ?? tickets.length;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
            <p className="mt-1 text-sm text-slate-600">รายการแจ้งปัญหาทั้งหมดจากระบบ Support</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-slate-200">
            <span className="text-slate-500">Total:</span>{" "}
            <span className="font-semibold text-slate-800">{total}</span>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            โหลดข้อมูลไม่สำเร็จ: {errorMessage}
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            ยังไม่มีรายการ ticket
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Ticket ID</th>
                    <th className="px-4 py-3 font-semibold">Issue</th>
                    <th className="px-4 py-3 font-semibold">Summary</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Destination</th>
                    <th className="px-4 py-3 font-semibold">Txn Time</th>
                    <th className="px-4 py-3 font-semibold">Opened At</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.ticket_id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{ticket.ticket_id}</div>
                        <div className="mt-1 text-xs text-slate-500">{ticket.account_id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{ticket.issue_type}</td>
                      <td className="max-w-md px-4 py-3 text-slate-700">{ticket.summary}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatAmount(ticket.amount)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {ticket.bankbiller_name} ({ticket.masked_destination})
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(ticket.txn_time)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(ticket.opened_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(ticket.status)}`}
                        >
                          {ticket.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
