import { useState, useEffect, useCallback } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { refundsApi, offerConfigsApi } from "@/lib/api";
import {
  RefreshCw, Search, ChevronDown, CheckCircle2, XCircle,
  ArrowDownLeft, Sparkles, Download, AlertTriangle, Clock, Eye,
  Save, Settings,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
type RefundStatus = 'pending' | 'under_review' | 'approved' | 'processing' | 'refunded' | 'rejected' | 'cancelled';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<RefundStatus | string, string> = {
  pending: 'bg-amber-500/10  border-amber-500/25  text-amber-400',
  under_review: 'bg-blue-500/10   border-blue-500/25   text-blue-400',
  approved: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
  processing: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
  refunded: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
  rejected: 'bg-rose-500/10   border-rose-500/25   text-rose-400',
  cancelled: 'bg-rose-500/10   border-rose-500/25   text-rose-400',
};

const STATUS_LABEL: Record<RefundStatus | string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Auto Approved',
  processing: 'Processing',
  refunded: 'Refunded',
  rejected: 'Not Eligible',
  cancelled: 'Cancelled',
};

const FILTERS = ['all', 'pending', 'under_review', 'approved', 'processing', 'refunded', 'rejected'];

// ── Policy summary strip ───────────────────────────────────────────────────────
const POLICY_TIERS = [
  { label: '> 7 days', pct: '100%', color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/15' },
  { label: '3 – 7 days', pct: '75%', color: 'text-blue-400', bg: 'bg-blue-500/5    border-blue-500/15' },
  { label: '24 – 72 hrs', pct: '50%', color: 'text-amber-400', bg: 'bg-amber-500/5   border-amber-500/15' },
  { label: '< 24 hrs', pct: '0%', color: 'text-rose-400', bg: 'bg-rose-500/5    border-rose-500/15' },
];

// ── Override modal ─────────────────────────────────────────────────────────────
function OverrideModal({ refund, defaultTab, onClose, onDone }: { refund: any; defaultTab: 'approve' | 'reject' | 'complete'; onClose: () => void; onDone: () => void }) {
  const isProcessing = refund.status === 'processing';
  const isApproved = refund.status === 'approved';

  const [tab, setTab] = useState<'approve' | 'reject' | 'complete'>(() => {
    if (defaultTab === 'reject') return 'reject';
    if (isProcessing) return 'complete';
    if (isApproved) {
      return defaultTab === 'approve' ? 'approve' : 'complete';
    }
    return 'approve';
  });

  const [pct, setPct] = useState(refund.selectedPercentage ?? 100);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleApprove = async () => {
    setLoading(true); setErr('');
    try {
      await refundsApi.approve(refund.id, { selectedPercentage: +pct, adminNotes: notes });
      toast.success(`Refund of ${pct}% approved successfully!`);
      onDone();
    } catch (e: any) { setErr(e.message); toast.error(e.message || "Failed to approve refund"); } finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!reason.trim()) { setErr('Rejection reason is required'); return; }
    setLoading(true); setErr('');
    try {
      await refundsApi.reject(refund.id, { rejectionReason: reason });
      toast.success("Refund rejected successfully.");
      onDone();
    } catch (e: any) { setErr(e.message); toast.error(e.message || "Failed to reject refund"); } finally { setLoading(false); }
  };

  const handleComplete = async () => {
    if (!referenceId.trim()) { setErr('Reference ID is required'); return; }
    setLoading(true); setErr('');
    try {
      await refundsApi.complete(refund.id, { referenceId });
      toast.success("Refund marked as refunded (completed)!");
      onDone();
    } catch (e: any) { setErr(e.message); toast.error(e.message || "Failed to complete refund"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-card rounded-2xl p-6 w-full max-w-md border border-[var(--gold)]/20 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <XCircle className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-gold" />
          </div>
          <div>
            <h3 className="font-display text-lg text-foreground">Manual Override</h3>
            <p className="text-[10px] text-muted-foreground">REF-{refund.id} · This bypasses the automated policy</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(isProcessing || isApproved) && (
            <button onClick={() => setTab('complete')} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition ${tab === 'complete' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}>
              Complete
            </button>
          )}
          {!isProcessing && (
            <button onClick={() => setTab('approve')} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition ${tab === 'approve' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}>
              {isApproved ? 'Adjust Amount' : 'Approve'}
            </button>
          )}
          <button onClick={() => setTab('reject')} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition ${tab === 'reject' ? 'bg-rose-500/10 border-rose-500/25 text-rose-400' : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}>
            Reject
          </button>
        </div>

        {tab === 'complete' && (isProcessing || isApproved) && (
          <div className="space-y-3">
            {refund.status === 'approved' && (
              <>
                <p className="text-xs text-muted-foreground">This refund is <span className="text-emerald-400 font-semibold">Approved</span>. Move to Processing then Complete:</p>
                <button onClick={() => { setLoading(true); refundsApi.processing(refund.id).then(onDone).catch((e) => setErr(e.message)).finally(() => setLoading(false)); }}
                  disabled={loading} className="w-full py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/10 transition disabled:opacity-50">
                  Mark as Processing
                </button>
              </>
            )}
            {refund.status === 'processing' && (
              <p className="text-xs text-muted-foreground">This refund is in <span className="text-blue-400 font-semibold">Processing</span> status. Enter gateway reference to complete:</p>
            )}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Gateway Reference / Transaction ID</label>
              <input value={referenceId} onChange={e => setReferenceId(e.target.value)} placeholder="e.g. rzp_refund_xxxx..." className="luxury-input w-full rounded-xl px-3 py-2 text-sm bg-transparent" />
            </div>
            <button onClick={handleComplete} disabled={loading} className="w-full gold-btn py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50">
              {loading ? 'Saving...' : 'Mark as Refunded (Complete)'}
            </button>
          </div>
        )}

        {tab === 'approve' && !isProcessing && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Refund % to Award</label>
              <input type="number" min={0} max={100} value={pct} onChange={e => setPct(+e.target.value)} className="luxury-input w-full rounded-xl px-3 py-2 text-sm bg-transparent" />
              <p className="text-[10px] text-muted-foreground mt-0.5">= ₹{Math.round(Number(refund.originalAmount) * pct / 100).toLocaleString('en-IN')} of ₹{Number(refund.originalAmount).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Admin Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="luxury-input w-full rounded-xl px-3 py-2 text-sm bg-transparent h-16 resize-none" />
            </div>
            <button onClick={handleApprove} disabled={loading} className="w-full gold-btn py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50">
              {loading ? 'Saving...' : `Approve ${pct}% Refund`}
            </button>
          </div>
        )}

        {tab === 'reject' && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Rejection Reason *</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this request is being rejected..." className="luxury-input w-full rounded-xl px-3 py-2 text-sm bg-transparent h-20 resize-none" />
            </div>
            <button onClick={handleReject} disabled={loading} className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition disabled:opacity-50">
              {loading ? 'Saving...' : 'Reject Refund'}
            </button>
          </div>
        )}
        {err && (
          <div className="mt-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{err}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function RefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<any | null>(null);
  const [overrideTab, setOverrideTab] = useState<'approve' | 'reject' | 'complete'>('approve');

  // Policy management
  const [policyTiers, setPolicyTiers] = useState<any[]>([]);
  const [editingPolicy, setEditingPolicy] = useState(false);
  const [tier100Val, setTier100Val] = useState("100");
  const [tier75Val, setTier75Val] = useState("75");
  const [tier50Val, setTier50Val] = useState("50");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState("");

  const loadPolicy = useCallback(() => {
    refundsApi.getPolicy()
      .then(res => {
        setPolicyTiers(res.tiers || []);
        const t100 = res.tiers?.find((t: any) => t.minHours === 168);
        const t75 = res.tiers?.find((t: any) => t.minHours === 72);
        const t50 = res.tiers?.find((t: any) => t.minHours === 24);
        if (t100) setTier100Val(String(t100.percentage));
        if (t75) setTier75Val(String(t75.percentage));
        if (t50) setTier50Val(String(t50.percentage));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    setPolicyError("");
    try {
      const val100 = parseInt(tier100Val);
      const val75 = parseInt(tier75Val);
      const val50 = parseInt(tier50Val);

      if (isNaN(val100) || val100 < 0 || val100 > 100 ||
        isNaN(val75) || val75 < 0 || val75 > 100 ||
        isNaN(val50) || val50 < 0 || val50 > 100) {
        throw new Error("Percentages must be numbers between 0 and 100.");
      }

      await offerConfigsApi.upsert({
        configKey: 'refund_pct_tier_100',
        configValue: String(val100),
        valueType: 'number',
        label: 'Refund % (> 7 days)'
      });
      await offerConfigsApi.upsert({
        configKey: 'refund_pct_tier_75',
        configValue: String(val75),
        valueType: 'number',
        label: 'Refund % (3–7 days)'
      });
      await offerConfigsApi.upsert({
        configKey: 'refund_pct_tier_50',
        configValue: String(val50),
        valueType: 'number',
        label: 'Refund % (24–72 hours)'
      });

      toast.success("Refund policy percentages saved successfully!");
      setEditingPolicy(false);
      loadPolicy();
    } catch (err: any) {
      setPolicyError(err.message || "Failed to save policy percentages.");
      toast.error(err.message || "Failed to save policy percentages.");
    } finally {
      setSavingPolicy(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    refundsApi.getAll({
      status: activeFilter === 'all' ? undefined : activeFilter,
      searchKeyword: search || undefined,
      page,
      limit: 20,
    })
      .then(res => {
        setRefunds(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        if (res.data.length > 0 && !selected) setSelected(res.data[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeFilter, search, page]);

  useEffect(() => { load(); }, [load]);

  const handleOverrideDone = () => {
    setOverrideTarget(null);
    load();
  };

  // Stats
  const statCards = [
    { label: 'Total Requests', value: total, color: 'text-foreground' },
    { label: 'Auto Processed', value: refunds.filter(r => r.autoProcessed).length, color: 'text-gold' },
    { label: 'Refunded', value: refunds.filter(r => r.status === 'refunded').length, color: 'text-emerald-400' },
    { label: 'Rejected', value: refunds.filter(r => r.status === 'rejected').length, color: 'text-rose-400' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-auto min-h-0">
      <AdminHeader title="Refund Management" />

      <div className="flex-1 p-4 sm:p-6 space-y-5 overflow-auto">
        {/* Policy banner */}
        <div className="glass-card rounded-2xl border border-[var(--gold)]/15 p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              <span className="text-xs font-bold uppercase tracking-widest text-gold">Automated Policy Engine Active</span>
            </div>
            <button
              onClick={() => setEditingPolicy(!editingPolicy)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-gold/30 bg-white/5 hover:bg-gold/10 text-muted-foreground hover:text-gold text-xs font-medium transition cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              {editingPolicy ? "Close Settings" : "Configure Percentages"}
            </button>
          </div>

          {editingPolicy ? (
            <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-250">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Refund % for &gt; 7 days</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={tier100Val}
                    onChange={(e) => setTier100Val(e.target.value)}
                    className="luxury-input rounded-xl px-3 py-2 text-sm bg-black/40 text-foreground focus:border-[var(--gold)]/50 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Refund % for 3 – 7 days</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={tier75Val}
                    onChange={(e) => setTier75Val(e.target.value)}
                    className="luxury-input rounded-xl px-3 py-2 text-sm bg-black/40 text-foreground focus:border-[var(--gold)]/50 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Refund % for 24 – 72 hrs</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={tier50Val}
                    onChange={(e) => setTier50Val(e.target.value)}
                    className="luxury-input rounded-xl px-3 py-2 text-sm bg-black/40 text-foreground focus:border-[var(--gold)]/50 focus:outline-none"
                  />
                </div>
              </div>
              {policyError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">{policyError}</p>
              )}
              <div className="flex gap-2.5">
                <button
                  onClick={handleSavePolicy}
                  disabled={savingPolicy}
                  className="gold-btn px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingPolicy ? "Saving..." : "Save Percentages"}
                </button>
                <button
                  onClick={() => setEditingPolicy(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {policyTiers.map(t => {
                let color = 'text-muted-foreground';
                let bg = 'bg-white/5 border-white/10';
                if (t.minHours === 168) { color = 'text-emerald-400'; bg = 'bg-emerald-500/5 border-emerald-500/15'; }
                else if (t.minHours === 72) { color = 'text-blue-400'; bg = 'bg-blue-500/5 border-blue-500/15'; }
                else if (t.minHours === 24) { color = 'text-amber-400'; bg = 'bg-amber-500/5 border-amber-500/15'; }
                else if (t.minHours === 0) { color = 'text-rose-400'; bg = 'bg-rose-500/5 border-rose-500/15'; }

                const labelText =
                  t.minHours === 168 ? '> 7 days' :
                    t.minHours === 72 ? '3 – 7 days' :
                      t.minHours === 24 ? '24 – 72 hrs' :
                        '< 24 hrs';

                return (
                  <div key={t.label} className={`rounded-xl border p-3 text-center ${bg}`}>
                    <span className={`text-xl font-bold block ${color}`}>{t.percentage}%</span>
                    <span className="text-muted-foreground text-[10px]">{labelText}</span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-3 font-medium">All refund decisions are calculated dynamically based on the event countdown according to the active configuration values.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map(s => (
            <div key={s.label} className="glass-card rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by REF-ID, booking ID, customer name or email..."
              className="luxury-input w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-transparent"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button key={f} onClick={() => { setActiveFilter(f); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold capitalize transition ${activeFilter === f ? 'bg-[var(--gold)]/10 border-[var(--gold)]/30 text-gold' : 'border-white/10 text-muted-foreground hover:bg-white/5'
                  }`}>
                {f === 'all' ? 'All' : STATUS_LABEL[f] || f}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground transition">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Main content */}
        {loading ? (
          <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-gold" />
            <span className="text-sm">Loading refund requests...</span>
          </div>
        ) : refunds.length === 0 ? (
          <div className="glass-card rounded-2xl p-16 text-center text-muted-foreground text-sm">
            <ArrowDownLeft className="h-8 w-8 text-gold/20 mx-auto mb-3" />
            <p>No refund requests found.</p>
          </div>
        ) : (
          <div className="grid xl:grid-cols-[1fr_420px] gap-5">
            {/* List */}
            <div className="space-y-2.5">
              {refunds.map(r => (
                <div
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`glass-card rounded-2xl p-4 border transition-all cursor-pointer relative overflow-hidden ${selected?.id === r.id ? 'border-[var(--gold)] bg-[var(--gold)]/5 shadow-lg' : 'hover:border-white/15 border-white/5'
                    }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-muted-foreground">REF-{r.id}</span>
                        {r.autoProcessed && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-[9px] font-bold uppercase tracking-wider text-gold">
                            <Sparkles className="h-2.5 w-2.5" />Auto
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground">{r.customerName || `Customer #${r.userId}`}</p>
                      <p className="text-[11px] text-muted-foreground">{r.customerEmail} · Booking #{r.bookingId}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground border-t border-white/5 pt-2">
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider">Original</span>
                      <span className="text-foreground font-semibold">₹{Number(r.originalAmount).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider">Refund</span>
                      <span className={`font-semibold ${['approved', 'processing', 'refunded'].includes(r.status) ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        {['approved', 'processing', 'refunded'].includes(r.status) ? `₹${Number(r.refundableAmount).toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider">Policy</span>
                      <span className="truncate">{r.selectedPercentage != null ? `${r.selectedPercentage}%` : '—'}</span>
                    </div>
                  </div>
                  {r.policyTier && <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{r.policyTier}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.createdAt).toLocaleString("en-IN")}</p>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-xl border border-white/10 text-xs text-muted-foreground hover:bg-white/5 disabled:opacity-40">Prev</button>
                  <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-xl border border-white/10 text-xs text-muted-foreground hover:bg-white/5 disabled:opacity-40">Next</button>
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 sticky top-6 h-fit max-h-[calc(100vh-220px)] overflow-y-auto">
              {selected ? (
                <div className="space-y-4 text-sm">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-xl text-foreground font-semibold">REF-{selected.id}</h3>
                        {selected.autoProcessed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-[9px] font-bold uppercase tracking-wider text-gold">
                            <Sparkles className="h-2.5 w-2.5" />Auto-Processed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(selected.createdAt).toLocaleString("en-IN")}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider shrink-0 ${STATUS_BADGE[selected.status]}`}>
                      {STATUS_LABEL[selected.status]}
                    </span>
                  </div>

                  {/* Customer */}
                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3.5 space-y-2 text-xs">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Customer</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground block">Name</span><span className="text-foreground font-medium">{selected.customerName || '—'}</span></div>
                      <div><span className="text-muted-foreground block">Booking ID</span><span className="text-foreground font-mono">#{selected.bookingId}</span></div>
                      <div className="col-span-2"><span className="text-muted-foreground block">Email</span><span className="text-foreground">{selected.customerEmail || '—'}</span></div>
                      <div><span className="text-muted-foreground block">Phone</span><span className="text-foreground">{selected.customerPhone || '—'}</span></div>
                      <div><span className="text-muted-foreground block">Payment Method</span><span className="text-foreground capitalize">{selected.paymentMethod || '—'}</span></div>
                    </div>
                  </div>

                  {/* Policy applied */}
                  {selected.policyTier && (
                    <div className="rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/15 p-3.5 text-xs space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-gold font-bold">Policy Applied by Engine</p>
                      <p className="text-foreground font-medium">{selected.policyTier}</p>
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
                        <div><span className="text-muted-foreground block">Refund %</span><span className="text-foreground font-bold">{selected.selectedPercentage}%</span></div>
                        <div><span className="text-muted-foreground block">Hrs Before</span><span className="text-foreground font-medium">{Number(selected.hoursBeforeEvent).toFixed(1)}h</span></div>
                        {Number(selected.gatewayChargeAmount) > 0 && <div><span className="text-muted-foreground block">Gateway Fee</span><span className="text-foreground">₹{Number(selected.gatewayChargeAmount).toLocaleString('en-IN')}</span></div>}
                      </div>
                    </div>
                  )}

                  {/* Amounts */}
                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3.5 text-xs space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Financials</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground block">Original Paid</span><span className="text-foreground font-semibold">₹{Number(selected.originalAmount).toLocaleString('en-IN')}</span></div>
                      <div>
                        <span className="text-muted-foreground block">Refund Amount</span>
                        <span className={`font-bold text-base ${['approved', 'processing', 'refunded'].includes(selected.status) ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          {['approved', 'processing', 'refunded'].includes(selected.status) ? `₹${Number(selected.refundableAmount).toLocaleString('en-IN')}` : '—'}
                        </span>
                      </div>
                    </div>
                    {selected.referenceId && (
                      <div className="border-t border-white/5 pt-2">
                        <span className="text-muted-foreground block mb-0.5">Reference / Txn ID</span>
                        <span className="text-foreground font-mono text-[11px]">{selected.referenceId}</span>
                      </div>
                    )}
                  </div>

                  {/* Customer comments */}
                  {(selected.customerMessage || selected.refundReason) && (
                    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3.5 text-xs space-y-1.5">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Customer Notes</p>
                      {selected.refundReason && <p className="text-foreground capitalize">Reason: {selected.refundReason.replace('_', ' ')}</p>}
                      {selected.customerMessage && <p className="text-foreground italic bg-black/20 p-2 rounded-lg border border-white/5">"{selected.customerMessage}"</p>}
                    </div>
                  )}

                  {/* Rejection note */}
                  {selected.status === 'rejected' && selected.rejectionReason && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-xs text-rose-300">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-rose-400 mb-1">Rejection Reason</p>
                      <p>{selected.rejectionReason}</p>
                    </div>
                  )}

                  {/* Attachments */}
                  {selected.attachments && selected.attachments.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Evidence Files</p>
                      <div className="flex flex-wrap gap-2">
                        {selected.attachments.map((url: string, i: number) => {
                          const filename = url.split('/').pop() || 'File';
                          return (
                            <a key={i} href={`http://localhost:4000${url}`} target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl border border-white/10 hover:border-gold bg-white/5 hover:bg-gold/5 text-xs text-gold flex items-center gap-1.5 transition-all">
                              <Download className="h-3 w-3" />{filename.length > 20 ? filename.slice(0, 12) + '...' + filename.slice(-6) : filename}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-1 space-y-2">
                    {selected.status === 'processing' && (
                      <div className="flex gap-2">
                        <button onClick={() => { setOverrideTab('complete'); setOverrideTarget(selected); }}
                          className="flex-1 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/10 transition flex items-center justify-center gap-2 cursor-pointer">
                          <CheckCircle2 className="h-3.5 w-3.5" />Mark as Refunded
                        </button>
                        <button onClick={() => { setOverrideTab('reject'); setOverrideTarget(selected); }}
                          className="flex-1 py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition flex items-center justify-center gap-2 cursor-pointer">
                          <XCircle className="h-3.5 w-3.5" />Reject Refund
                        </button>
                      </div>
                    )}
                    {!selected.autoProcessed && ['pending', 'under_review', 'approved'].includes(selected.status) && (
                      <div className="flex gap-2">
                        <button onClick={() => { setOverrideTab('approve'); setOverrideTarget(selected); }}
                          className="flex-1 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/10 transition flex items-center justify-center gap-2 cursor-pointer">
                          <CheckCircle2 className="h-3.5 w-3.5" />Approve Refund
                        </button>
                        <button onClick={() => { setOverrideTab('reject'); setOverrideTarget(selected); }}
                          className="flex-1 py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition flex items-center justify-center gap-2 cursor-pointer">
                          <XCircle className="h-3.5 w-3.5" />Reject Refund
                        </button>
                      </div>
                    )}
                    {!selected.autoProcessed && selected.status === 'pending' && (
                      <button onClick={() => { refundsApi.underReview(selected.id).then(load).catch(console.error); }}
                        className="w-full py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-semibold hover:bg-blue-500/10 transition flex items-center justify-center gap-2 cursor-pointer">
                        <Eye className="h-3.5 w-3.5" />Mark Under Review
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground py-20">
                  <ArrowDownLeft className="h-8 w-8 text-gold/20 mb-3" />
                  <span className="text-sm">Select a request to view details</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Override modal */}
      {overrideTarget && (
        <OverrideModal refund={overrideTarget} defaultTab={overrideTab} onClose={() => setOverrideTarget(null)} onDone={handleOverrideDone} />
      )}
    </div>
  );
}
