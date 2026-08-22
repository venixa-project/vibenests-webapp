import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Search, Check, X, Award, AlertTriangle, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { referralsApi, offerConfigsApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function AdminReferralsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<number | null>(null);

  // Referral config states
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [rewardValue, setRewardValue] = useState("500");
  const [updatingConfig, setUpdatingConfig] = useState(false);

  async function loadConfigs() {
    try {
      const map = await offerConfigsApi.getMap();
      if (map) {
        if (map.REFERRAL_SYSTEM_ENABLED !== undefined) {
          setSystemEnabled(map.REFERRAL_SYSTEM_ENABLED === "true");
        }
        if (map.REFERRAL_REWARD_VALUE !== undefined) {
          setRewardValue(map.REFERRAL_REWARD_VALUE);
        }
      }
    } catch (err) {
      console.error("Failed to load offer configurations:", err);
    }
  }

  async function loadReferrals() {
    try {
      setLoading(true);
      const res = await referralsApi.adminGetAll({ page, limit: 20 });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error("Failed to load referrals:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferrals();
    loadConfigs();
  }, [page]);

  async function handleApprove(rewardId: number) {
    if (!window.confirm("Are you sure you want to manually approve and issue this referral reward coupon?")) return;
    try {
      setActionBusy(rewardId);
      await referralsApi.adminApproveReward(rewardId);
      toast.success("Reward approved and coupon activated successfully!");
      loadReferrals();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve reward");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleRevoke(rewardId: number) {
    if (!window.confirm("Are you sure you want to revoke this referral reward? This will deactivate the associated coupon.")) return;
    try {
      setActionBusy(rewardId);
      await referralsApi.adminRevokeReward(rewardId);
      toast.success("Reward revoked successfully.");
      loadReferrals();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke reward");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleSaveConfigs() {
    try {
      setUpdatingConfig(true);
      await offerConfigsApi.upsert({
        configKey: "REFERRAL_SYSTEM_ENABLED",
        configValue: systemEnabled ? "true" : "false",
      });
      await offerConfigsApi.upsert({
        configKey: "REFERRAL_REWARD_VALUE",
        configValue: String(rewardValue),
      });
      toast.success("Referral settings updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
    } finally {
      setUpdatingConfig(false);
    }
  }

  // Client-side search filtering
  const filtered = data.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.referrer?.fullName || "").toLowerCase().includes(q) ||
      (item.referrer?.email || "").toLowerCase().includes(q) ||
      (item.referee?.fullName || "").toLowerCase().includes(q) ||
      (item.referee?.email || "").toLowerCase().includes(q) ||
      (item.code || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[oklch(0.09_0.02_260)] text-foreground">
      <AdminHeader title="Referrals & Rewards" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Settings Panel */}
        <div className="glass-card rounded-3xl p-6 border border-gold/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <h3 className="font-display text-base text-foreground mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-gold" />
            Referral Program Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end relative z-10">
            {/* Toggle Switch */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Program Status
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSystemEnabled(!systemEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    systemEnabled ? "bg-gold" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-black transition-transform ${
                      systemEnabled ? "translate-x-6 bg-black" : "translate-x-0 bg-white/70"
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-foreground">
                  {systemEnabled ? "Active & Enabled" : "Disabled / Suspended"}
                </span>
              </div>
            </div>

            {/* Discount Value */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Referral Discount Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={rewardValue}
                onChange={(e) => setRewardValue(e.target.value)}
                placeholder="500"
                className="luxury-input w-full rounded-xl px-4 py-2 text-sm bg-black/40 border border-white/10 text-foreground focus:border-gold/50"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveConfigs}
              disabled={updatingConfig}
              className="gold-btn py-2.5 rounded-xl text-xs font-semibold hover:opacity-95 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 animate-pulse"
            >
              {updatingConfig ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </button>
          </div>
        </div>

        {/* Top search and meta summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="luxury-input w-full rounded-xl pl-9 pr-4 py-2 text-sm bg-black/40 border border-white/10 text-foreground placeholder:text-muted-foreground/60"
            />
          </div>

          <button
            onClick={loadReferrals}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] transition text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh List
          </button>
        </div>

        {/* Referrals table */}
        <div className="glass-card rounded-2xl border border-[var(--gold)]/10 overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
              <p className="text-sm">Loading referral logs...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground text-sm">
              No referral records found matching query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-muted-foreground uppercase tracking-wider font-semibold">
                    <th className="px-6 py-4">Referrer (Inviter)</th>
                    <th className="px-6 py-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded border border-white/10 bg-white/5 text-[9px]">code</span>
                    </th>
                    <th className="px-6 py-4">Referee (Friend Invited)</th>
                    <th className="px-6 py-4">Joined At</th>
                    <th className="px-6 py-4">Relationship Status</th>
                    <th className="px-6 py-4">Reward Coupon Details</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filtered.map((item) => {
                    const statusColor =
                      item.status === "successful"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : item.status === "revoked"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : "bg-amber-400/10 text-amber-400 border-amber-400/20";

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition">
                        {/* Referrer */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-foreground">{item.referrer?.fullName || "Legacy User"}</div>
                          <div className="text-[10px] text-muted-foreground">{item.referrer?.email || ""}</div>
                        </td>

                        {/* Code */}
                        <td className="px-6 py-4 text-center">
                          <span className="font-mono text-gold px-2 py-1 rounded bg-gold/5 border border-gold/10 uppercase font-semibold">
                            {item.code}
                          </span>
                        </td>

                        {/* Referee */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-foreground">{item.referee?.fullName || "Invited Guest"}</div>
                          <div className="text-[10px] text-muted-foreground">{item.referee?.email || ""}</div>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        {/* Relationship Status */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold border capitalize ${statusColor}`}>
                            {item.status}
                          </span>
                        </td>

                        {/* Reward */}
                        <td className="px-6 py-4">
                          {item.reward ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-medium text-gold select-all">{item.reward.couponCode}</span>
                                <span className="text-[10px] text-muted-foreground">({item.reward.value ? `₹${item.reward.value}` : "N/A"})</span>
                              </div>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] border ${
                                item.reward.status === "redeemed"
                                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                  : item.reward.status === "revoked"
                                    ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                                    : "bg-gold/10 border-gold/25 text-gold"
                              }`}>
                                {item.reward.status === "redeemed" ? "Redeemed" : item.reward.status === "revoked" ? "Revoked" : "Active"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">No reward issued</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          {item.reward && (
                            <div className="flex items-center justify-end gap-2">
                              {/* Manual approve (if pending or revoked) */}
                              {item.reward.status !== "redeemed" && item.reward.status !== "issued" && (
                                <button
                                  onClick={() => handleApprove(item.reward.id)}
                                  disabled={actionBusy === item.reward.id}
                                  className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/50 transition cursor-pointer"
                                  title="Manually Issue/Approve Reward"
                                >
                                  {actionBusy === item.reward.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}

                              {/* Revoke (if active/issued) */}
                              {item.reward.status === "issued" && (
                                <button
                                  onClick={() => handleRevoke(item.reward.id)}
                                  disabled={actionBusy === item.reward.id}
                                  className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/50 transition cursor-pointer"
                                  title="Revoke Reward & Coupon"
                                >
                                  {actionBusy === item.reward.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <X className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs font-semibold rounded-lg border border-white/10 hover:bg-white/5 transition disabled:opacity-50 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-xs font-semibold text-muted-foreground flex items-center">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage((p) => (p * 20 < total ? p + 1 : p))}
              disabled={page * 20 >= total}
              className="px-3 py-1 text-xs font-semibold rounded-lg border border-white/10 hover:bg-white/5 transition disabled:opacity-50 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
