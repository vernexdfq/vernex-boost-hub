import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  History as HistoryIcon,
  MinusCircle,
  Pencil,
  PlusCircle,
  X,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import {
  adjustChildPanelWallet,
  listChildPanelLogs,
  listChildPanels,
  updateChildPanel,
  type ChildPanel,
  type PanelLog,
} from "@/lib/functions/admin.functions";

export const Route = createFileRoute("/admin/panels")({
  head: () => ({
    meta: [{ title: "Child Panels — Verxor Admin" }],
  }),
  component: AdminPanelsPage,
});

function naira(n: number) {
  return "₦" + (Number(n) || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

function PanelStatusPill({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
        (active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")
      }
    >
      {active ? "● Active" : "● Paused"}
    </span>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function AdminPanelsPage() {
  const fetchPanels = useServerFn(listChildPanels);
  const fetchLogs = useServerFn(listChildPanelLogs);
  const adjustWallet = useServerFn(adjustChildPanelWallet);
  const savePanel = useServerFn(updateChildPanel);

  const [panels, setPanels] = useState<ChildPanel[]>([]);
  const [panelsLoading, setPanelsLoading] = useState(true);

  const [walletModal, setWalletModal] = useState<{ panel: ChildPanel; kind: "credit" | "debit" } | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);

  const [editModal, setEditModal] = useState<ChildPanel | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [historyModal, setHistoryModal] = useState<{ panel: ChildPanel; logs: PanelLog[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadPanels = useCallback(async () => {
    setPanelsLoading(true);
    try {
      const res = await fetchPanels();
      setPanels(res.panels);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load panels");
    } finally {
      setPanelsLoading(false);
    }
  }, [fetchPanels]);

  useEffect(() => {
    void loadPanels();
  }, [loadPanels]);

  const openWallet = (panel: ChildPanel, kind: "credit" | "debit") => {
    setAmountInput("");
    setNoteInput("");
    setWalletModal({ panel, kind });
  };

  const submitWallet = async () => {
    if (!walletModal) return;
    const amount = Number(amountInput);
    if (!(amount > 0)) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    setWalletBusy(true);
    try {
      const res = await adjustWallet({
        data: {
          panelId: walletModal.panel.id,
          kind: walletModal.kind,
          amount,
          note: noteInput.trim() || undefined,
        },
      });
      toast.success(
        (walletModal.kind === "credit" ? "Added " : "Removed ") +
          naira(amount) +
          " — new balance " +
          naira(res.balance),
      );
      setWalletModal(null);
      await loadPanels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setWalletBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!editModal) return;
    setEditBusy(true);
    try {
      await savePanel({
        data: {
          panelId: editModal.id,
          name: editModal.name,
          phone: editModal.phone,
          email: editModal.email,
          status: editModal.status === "paused" ? "paused" : "active",
          notes: editModal.notes,
        },
      });
      toast.success("Panel updated");
      setEditModal(null);
      await loadPanels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setEditBusy(false);
    }
  };

  const openHistory = async (panel: ChildPanel) => {
    setHistoryModal({ panel, logs: [] });
    setHistoryLoading(true);
    try {
      const res = await fetchLogs({ data: { panelId: panel.id } });
      setHistoryModal({ panel, logs: res.logs });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load history");
      setHistoryModal(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <AdminShell title="Child Panels" subtitle="Wallets, funding & details" active="panels">
      <div className="mx-auto max-w-3xl space-y-4">
        {panelsLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Loading panels…
          </div>
        ) : panels.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            No child panels yet.
          </div>
        ) : (
          panels.map((panel) => (
            <div key={panel.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{panel.name}</p>
                  <p className="font-mono text-[10px] text-slate-400">{panel.slug}</p>
                </div>
                <PanelStatusPill status={panel.status} />
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Wallet Balance
                </p>
                <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">
                  {naira(panel.walletBalance)}
                </p>
              </div>

              <div className="mt-3 space-y-1 text-xs">
                {panel.phone ? (
                  <p className="text-slate-500">
                    Phone: <span className="font-semibold text-slate-900">{panel.phone}</span>
                  </p>
                ) : null}
                {panel.email ? (
                  <p className="text-slate-500">
                    Email: <span className="font-semibold text-slate-900">{panel.email}</span>
                  </p>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openWallet(panel, "credit")}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-xs font-bold text-white"
                >
                  <PlusCircle className="h-4 w-4" /> Add Money
                </button>
                <button
                  type="button"
                  onClick={() => openWallet(panel, "debit")}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-red-600 text-xs font-bold text-white"
                >
                  <MinusCircle className="h-4 w-4" /> Remove Money
                </button>
                <button
                  type="button"
                  onClick={() => setEditModal({ ...panel })}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Details
                </button>
                <button
                  type="button"
                  onClick={() => void openHistory(panel)}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                >
                  <HistoryIcon className="h-3.5 w-3.5" /> History
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {walletModal ? (
        <Modal onClose={() => setWalletModal(null)}>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              {walletModal.kind === "credit" ? "Add Money" : "Remove Money"} — {walletModal.panel.name}
            </h3>
            <button type="button" onClick={() => setWalletModal(null)} className="p-1 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Current balance: {naira(walletModal.panel.walletBalance)}
          </p>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Amount (₦)
          </label>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="0.00"
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold tabular-nums outline-none focus:border-blue-500"
          />
          <label className="mb-1 mt-3 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Note (optional)
          </label>
          <input
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder={walletModal.kind === "credit" ? "e.g. Monthly wholesale funding" : "e.g. Adjustment / refund"}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="button"
            disabled={walletBusy}
            onClick={() => void submitWallet()}
            className={
              "mt-4 h-12 w-full rounded-xl text-sm font-bold text-white disabled:opacity-60 " +
              (walletModal.kind === "credit" ? "bg-emerald-600" : "bg-red-600")
            }
          >
            {walletBusy ? "Processing…" : walletModal.kind === "credit" ? "Confirm — Add Money" : "Confirm — Remove Money"}
          </button>
        </Modal>
      ) : null}

      {editModal ? (
        <Modal onClose={() => setEditModal(null)}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Edit Panel — {editModal.slug}</h3>
            <button type="button" onClick={() => setEditModal(null)} className="p-1 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          {[
            {
              label: "Panel Name",
              value: editModal.name,
              onChange: (v: string) => setEditModal({ ...editModal, name: v }),
            },
            {
              label: "Phone Number",
              value: editModal.phone,
              onChange: (v: string) => setEditModal({ ...editModal, phone: v }),
            },
            {
              label: "Email",
              value: editModal.email,
              onChange: (v: string) => setEditModal({ ...editModal, email: v }),
            },
          ].map((f) => (
            <div key={f.label} className="mb-3">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {f.label}
              </label>
              <input
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-500"
              />
            </div>
          ))}
          <div className="mb-3">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["active", "paused"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setEditModal({ ...editModal, status: s })}
                  className={
                    "h-10 rounded-xl text-xs font-bold " +
                    (editModal.status === s
                      ? s === "active"
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600")
                  }
                >
                  {s === "active" ? "Active" : "Paused"}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Notes
            </label>
            <textarea
              value={editModal.notes}
              onChange={(e) => setEditModal({ ...editModal, notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            disabled={editBusy}
            onClick={() => void submitEdit()}
            className="h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white disabled:opacity-60"
          >
            {editBusy ? "Saving…" : "Save Changes"}
          </button>
        </Modal>
      ) : null}

      {historyModal ? (
        <Modal onClose={() => setHistoryModal(null)}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Wallet History — {historyModal.panel.name}
            </h3>
            <button type="button" onClick={() => setHistoryModal(null)} className="p-1 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          {historyLoading ? (
            <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
          ) : historyModal.logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No wallet adjustments yet.</p>
          ) : (
            <div className="space-y-2">
              {historyModal.logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        "text-xs font-bold " + (log.kind === "credit" ? "text-emerald-600" : "text-red-600")
                      }
                    >
                      {log.kind === "credit" ? "+" : "−"}
                      {naira(log.amount)}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-slate-500">
                      Balance: {naira(log.balanceAfter)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString("en-NG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {log.createdBy ? " · by " + log.createdBy : ""}
                  </p>
                  {log.note ? (
                    <p className="mt-0.5 text-[11px] italic text-slate-500">{log.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Modal>
      ) : null}
    </AdminShell>
  );
}
