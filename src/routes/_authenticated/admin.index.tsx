import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Ban,
  History as HistoryIcon,
  LayoutDashboard,
  Lock,
  MinusCircle,
  Pencil,
  PlusCircle,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import {
  adjustChildPanelWallet,
  checkAdminAccess,
  listChildPanelLogs,
  listChildPanels,
  updateChildPanel,
  type ChildPanel,
  type PanelLog,
} from "@/lib/functions/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — Verxor" },
      { name: "description", content: "Verxor admin: child panels, wallets & pricing." },
    ],
  }),
  component: AdminIndex,
});

type Section = "overview" | "panels";

const NAV: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "panels", label: "Child Panels", icon: Users },
];

function naira(n: number) {
  return "₦" + (Number(n) || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

function PanelStatusPill({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
        (active ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")
      }
    >
      {active ? "● Active" : "● Paused"}
    </span>
  );
}

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
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
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function AdminIndex() {
  const checkAdmin = useServerFn(checkAdminAccess);
  const fetchPanels = useServerFn(listChildPanels);
  const fetchLogs = useServerFn(listChildPanelLogs);
  const adjustWallet = useServerFn(adjustChildPanelWallet);
  const savePanel = useServerFn(updateChildPanel);

  const [adminState, setAdminState] = useState<"loading" | "ok" | "denied">("loading");
  const [section, setSection] = useState<Section>("overview");
  const [panels, setPanels] = useState<ChildPanel[]>([]);
  const [panelsLoading, setPanelsLoading] = useState(false);

  const [walletModal, setWalletModal] = useState<{ panel: ChildPanel; kind: "credit" | "debit" } | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);

  const [editModal, setEditModal] = useState<ChildPanel | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [historyModal, setHistoryModal] = useState<{ panel: ChildPanel; logs: PanelLog[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await checkAdmin();
        if (!cancelled) setAdminState(res.isAdmin ? "ok" : "denied");
      } catch {
        if (!cancelled) setAdminState("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkAdmin]);

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
    if (adminState === "ok") void loadPanels();
  }, [adminState, loadPanels]);

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

  const totalBalance = panels.reduce((s, p) => s + (p.walletBalance || 0), 0);

  return (
    <AppShell>
      <PageHeader
        title="Admin"
        subtitle="Child panels, wallets & pricing"
        right={
          <Link
            to="/dashboard"
            aria-label="Back to dashboard"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-foreground/80"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      <div className="flex gap-4 px-5 pt-5">
        {/* Sidebar */}
        <aside className="hidden w-44 shrink-0 flex-col gap-1 sm:flex">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition " +
                  (active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground")
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
          <Link
            to="/admin/pricing"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-muted-foreground transition hover:bg-surface hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" />
            Pricing
          </Link>
        </aside>

        <div className="min-w-0 flex-1 space-y-4 pb-24">
          {/* Mobile nav */}
          <div className="flex gap-2 overflow-x-auto sm:hidden">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold " +
                    (active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-surface text-muted-foreground")
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
            <Link
              to="/admin/pricing"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-bold text-muted-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Pricing
            </Link>
          </div>

          {adminState === "loading" ? (
            <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground shadow-card-elev">
              Checking access…
            </div>
          ) : adminState === "denied" ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card-elev">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-500">
                <Lock className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-base font-bold">Access restricted</h2>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                This area is for Verxor administrators only.
              </p>
            </div>
          ) : section === "overview" ? (
            <>
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">Administrator access verified</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Manage Verxor child panels and configuration
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Child Panels
                  </p>
                  <p className="mt-1 text-2xl font-black tabular-nums">{panels.length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Total Panel Balance
                  </p>
                  <p className="mt-1 text-xl font-black tabular-nums">{naira(totalBalance)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSection("panels")}
                className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground"
              >
                Manage Child Panels
              </button>
            </>
          ) : (
            <>
              {panelsLoading ? (
                <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground shadow-card-elev">
                  Loading panels…
                </div>
              ) : panels.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground shadow-card-elev">
                  No child panels yet.
                </div>
              ) : (
                panels.map((panel) => (
                  <div
                    key={panel.id}
                    className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{panel.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{panel.slug}</p>
                      </div>
                      <PanelStatusPill status={panel.status} />
                    </div>

                    <div className="mt-3 rounded-xl border border-border bg-background/50 p-3 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Wallet Balance
                      </p>
                      <p className="mt-0.5 text-2xl font-black tabular-nums">
                        {naira(panel.walletBalance)}
                      </p>
                    </div>

                    <div className="mt-3 space-y-1 text-xs">
                      {panel.phone ? (
                        <p className="text-muted-foreground">
                          Phone: <span className="font-semibold text-foreground">{panel.phone}</span>
                        </p>
                      ) : null}
                      {panel.email ? (
                        <p className="text-muted-foreground">
                          Email: <span className="font-semibold text-foreground">{panel.email}</span>
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
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-bold"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit Details
                      </button>
                      <button
                        type="button"
                        onClick={() => openHistory(panel)}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-bold"
                      >
                        <HistoryIcon className="h-3.5 w-3.5" /> History
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Wallet modal */}
      {walletModal ? (
        <Overlay onClose={() => setWalletModal(null)}>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-bold">
              {walletModal.kind === "credit" ? "Add Money" : "Remove Money"} — {walletModal.panel.name}
            </h3>
            <button type="button" onClick={() => setWalletModal(null)} className="p-1 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Current balance: {naira(walletModal.panel.walletBalance)}
          </p>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Amount (₦)
          </label>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="0.00"
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-lg font-bold tabular-nums outline-none focus:border-primary"
          />
          <label className="mb-1 mt-3 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Note (optional)
          </label>
          <input
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder={walletModal.kind === "credit" ? "e.g. Monthly wholesale funding" : "e.g. Adjustment / refund"}
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            disabled={walletBusy}
            onClick={() => void submitWallet()}
            className={
              "mt-4 h-12 w-full rounded-xl text-sm font-bold text-white " +
              (walletModal.kind === "credit" ? "bg-emerald-600" : "bg-red-600") +
              (walletBusy ? " opacity-60" : "")
            }
          >
            {walletBusy
              ? "Processing…"
              : walletModal.kind === "credit"
                ? "Confirm — Add Money"
                : "Confirm — Remove Money"}
          </button>
        </Overlay>
      ) : null}

      {/* Edit modal */}
      {editModal ? (
        <Overlay onClose={() => setEditModal(null)}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">Edit Panel — {editModal.slug}</h3>
            <button type="button" onClick={() => setEditModal(null)} className="p-1 text-muted-foreground">
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
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {f.label}
              </label>
              <input
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
              />
            </div>
          ))}
          <div className="mb-3">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
                      : "border border-border bg-background text-muted-foreground")
                  }
                >
                  {s === "active" ? "Active" : "Paused"}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Notes
            </label>
            <textarea
              value={editModal.notes}
              onChange={(e) => setEditModal({ ...editModal, notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            disabled={editBusy}
            onClick={() => void submitEdit()}
            className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {editBusy ? "Saving…" : "Save Changes"}
          </button>
        </Overlay>
      ) : null}

      {/* History modal */}
      {historyModal ? (
        <Overlay onClose={() => setHistoryModal(null)}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">Wallet History — {historyModal.panel.name}</h3>
            <button type="button" onClick={() => setHistoryModal(null)} className="p-1 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {historyLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : historyModal.logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No wallet adjustments yet.
            </p>
          ) : (
            <div className="space-y-2">
              {historyModal.logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-border bg-background/50 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        "text-xs font-bold " +
                        (log.kind === "credit" ? "text-emerald-600" : "text-red-600")
                      }
                    >
                      {log.kind === "credit" ? "+" : "−"}
                      {naira(log.amount)}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                      Balance: {naira(log.balanceAfter)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("en-NG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {log.createdBy ? " · by " + log.createdBy : ""}
                  </p>
                  {log.note ? (
                    <p className="mt-0.5 text-[11px] italic text-muted-foreground">{log.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Overlay>
      ) : null}
    </AppShell>
  );
}
