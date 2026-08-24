import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  Search, Plus, Eye, X, User, Phone, Mail, ShieldOff, Shield,
  CheckCircle2, XCircle, CalendarDays, MailCheck, Loader2,
  AlertCircle
} from "lucide-react";
import { useAppData, type UserType } from "@/components/admin/AppDataContext";
import { usersApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { Trash2, PencilLine } from "lucide-react";


const emptyForm = { name: "", email: "", phone: "" };

const statusStyle: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Blocked: "bg-destructive/10 text-destructive border-destructive/20",
};

const bookingStatusStyle: Record<string, string> = {
  confirmed:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending:    "bg-amber-400/10 text-amber-400 border-amber-400/20",
  cancelled:  "bg-destructive/10 text-destructive border-destructive/20",
  completed:  "bg-sky-400/10 text-sky-400 border-sky-400/20",
  refunded:   "bg-purple-400/10 text-purple-400 border-purple-400/20",
};

type DetailUser = UserType & { isVerified?: boolean; rawBookings?: any[] };

export default function UsersPage() {
  const { users, setUsers, stats, refresh } = useAppData();
  const { t } = useTranslation();

  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // view drawer
  const [viewUser, setViewUser]     = useState<DetailUser | null>(null);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<DetailUser | null>(null);
  const [editForm, setEditForm] = useState<{ fullName: string; phone: string; dateOfBirth: string; marriageDate: string; isActive: boolean }>(() => ({
    fullName: "",
    phone: "",
    dateOfBirth: "",
    marriageDate: "",
    isActive: true,
  }));
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});

  const clearEditFieldError = (field: string) => {
    setEditFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<DetailUser | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [resending, setResending]   = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const nonAdmins = users.filter((u) => u.role !== "Admin");

  const filtered = nonAdmins.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone ?? "").includes(q) || u.id.includes(q);
    const matchStatus = statusFilter === "All" || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  /* ── Add User ─────────────────────────────────────────────────────────── */
  async function handleSave() {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) {
      errors.name = "Full name is required.";
    }
    if (!form.email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (form.phone && form.phone.replace(/\D/g, "").length < 10) {
      errors.phone = "Phone number must be at least 10 digits.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await usersApi.create({ fullName: form.name, email: form.email, phone: form.phone || undefined });
      refresh();
      setShowAdd(false);
      setForm(emptyForm);
      setFieldErrors({});
    } catch (err: any) {
      setFormError(err.message || "Failed to create user.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Block / Unblock ──────────────────────────────────────────────────── */
  async function toggleBlock(u: UserType) {
    try {
      await usersApi.toggleStatus(u.id);
      const next = u.status === "Active" ? "Blocked" : "Active";
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: next } : x));
      if (viewUser?.id === u.id) setViewUser((v) => v ? { ...v, status: next } : v);
    } catch {}
  }

  /* ── View Detail ──────────────────────────────────────────────────────── */
  async function openView(u: UserType) {
    setViewUser(u as DetailUser);
    setResendDone(false);
    setDetailLoading(true);
    try {
      const data = await usersApi.getById(u.id);
      setViewUser({ ...u, isVerified: data.isVerified, rawBookings: data.bookings });
    } catch {
      setViewUser({ ...u, rawBookings: [] });
    } finally { setDetailLoading(false); }
  }

  /* ── Edit User ───────────────────────────────────────────────────────── */
  function openEdit(u: UserType) {
    const du = u as DetailUser;
    setEditUser(du);
    setEditError(null);
    setEditFieldErrors({});
    setEditSaving(false);
    setEditForm({
      fullName: du.name || "",
      phone: du.phone || "",
      dateOfBirth: (du as any).dateOfBirth ? String((du as any).dateOfBirth) : "",
      marriageDate: (du as any).marriageDate ? String((du as any).marriageDate) : "",
      isActive: du.status === "Active",
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editUser) return;
    const errors: Record<string, string> = {};
    if (!editForm.fullName.trim()) {
      errors.fullName = "Full name is required.";
    }
    if (editForm.phone && editForm.phone.replace(/\D/g, "").length < 10) {
      errors.phone = "Phone number must be at least 10 digits.";
    }

    setEditFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      await usersApi.updateByAdmin(editUser.id, {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone ? editForm.phone : undefined,
        dateOfBirth: editForm.dateOfBirth ? editForm.dateOfBirth : undefined,
        marriageDate: editForm.marriageDate ? editForm.marriageDate : undefined,
        isActive: editForm.isActive,
      });
      refresh();
      setEditOpen(false);
      setEditUser(null);
      setEditFieldErrors({});
    } catch (err: any) {
      setEditError(err.message || "Failed to update user.");
    } finally {
      setEditSaving(false);
    }
  }

  /* ── Delete User ─────────────────────────────────────────────────────── */
  function openDelete(u: UserType) {
    setDeleteUser(u as DetailUser);
    setDeleteError(null);
    setDeleteBusy(false);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteUser) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await usersApi.deleteByAdmin(deleteUser.id);
      refresh();
      setDeleteOpen(false);
      setDeleteUser(null);
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete user.");
    } finally {
      setDeleteBusy(false);
    }
  }

  /* ── Resend Setup Email ───────────────────────────────────────────────── */
  async function resendSetup() {
    if (!viewUser || resending) return;
    setResending(true);
    try {
      await usersApi.resendSetup(viewUser.id);
      setResendDone(true);
    } catch {} finally { setResending(false); }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <AdminHeader title="Customer Management" />
      <div className="p-4 sm:p-6 space-y-5">

        {/* Stats */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: t("app.admin.totalCustomersStats","Total Customers"), count: nonAdmins.length, color: "border-[var(--gold)]/30 text-gold" },
            { label: t("app.admin.activeStats","Active"), count: stats.activeCustomers, color: "border-emerald-500/30 text-emerald-400" },
            { label: t("app.admin.blocked","Blocked"), count: stats.blockedCustomers, color: "border-destructive/30 text-destructive" },
          ].map((s) => (
            <div key={s.label} className={`glass-card rounded-xl px-4 py-2.5 border ${s.color} flex items-center gap-2`}>
              <span className="text-xl font-display font-semibold">{s.count}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filters + Add */}
        <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input type="text" placeholder={t("app.admin.searchCustomers","Search by name, email, phone or ID...")} value={search} onChange={(e) => setSearch(e.target.value)} className="luxury-input w-full rounded-lg pl-9 pr-4 py-2 text-xs" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="luxury-input rounded-lg px-3 py-2 text-xs text-foreground bg-transparent cursor-pointer">
            {["All", "Active", "Blocked"].map((s) => <option key={s} value={s} className="bg-[oklch(0.13_0.025_260)]">{s === "All" ? t("app.admin.allStatuses","All Statuses") : s === "Active" ? t("app.admin.active","Active") : t("app.admin.blocked","Blocked")}</option>)}
          </select>
          <button onClick={() => { setSearch(""); setStatusFilter("All"); }} className="text-xs text-muted-foreground hover:text-gold transition px-3 py-2 rounded-lg border border-white/10 hover:border-[var(--gold)]/30">{t("app.admin.clear","Clear")}</button>
          <button onClick={() => { setForm(emptyForm); setFormError(null); setFieldErrors({}); setShowAdd(true); }} className="flex items-center gap-2 gold-btn px-4 py-2 rounded-lg text-xs font-semibold ml-auto">
            <Plus className="h-3.5 w-3.5" /> {t("app.admin.addCustomerBtn","Add Customer")}
          </button>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-medium text-foreground">{t("app.admin.allCustomersTitle","All Customers")}</h3>
            <span className="text-xs text-muted-foreground">{filtered.length} of {nonAdmins.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-white/[0.06]">
                  <th className="pb-3 pr-4">{t("app.admin.customer","Customer")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.contact","Contact")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.status","Status")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.joined","Joined")}</th>
                  <th className="pb-3 pr-4 text-center">{t("app.admin.bookings","Bookings")}</th>
                  <th className="pb-3">{t("app.admin.actions","Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">{t("app.admin.noCustomersFound","No customers found")}</td></tr>
                ) : filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center shrink-0">
                          <span className="text-gold font-semibold text-sm">{u.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-foreground font-medium text-sm leading-tight">{u.name}</p>
                            {u.membership && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                u.membership.toLowerCase().includes("silver")
                                  ? "bg-slate-400/15 text-slate-300 border-slate-500/20"
                                  : "bg-gold/15 text-gold border-gold/25"
                              }`}>
                                {u.membership} Member
                              </span>
                            )}
                            {!u.membership && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium bg-white/5 text-muted-foreground border border-white/10">
                                Not a Member
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">ID #{u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" />{u.email}</span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3 shrink-0" />{u.phone || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusStyle[u.status]}`}>{u.status}</span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">{u.joined}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/5 border border-white/10 text-foreground font-medium">{u.bookings}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openView(u)} className="p-1.5 rounded-lg text-muted-foreground hover:text-sky-400 hover:bg-sky-400/10 transition" title="View Details"><Eye className="h-3.5 w-3.5" /></button>
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg transition text-muted-foreground hover:text-[var(--gold)] hover:bg-[var(--gold)]/10" title="Edit">
                          <PencilLine className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openDelete(u)} className="p-1.5 rounded-lg transition text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => toggleBlock(u)} className={`p-1.5 rounded-lg transition ${u.status === "Active" ? "text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10" : "text-amber-400 bg-amber-400/10"}`} title={u.status === "Active" ? "Block" : "Unblock"}>
                          {u.status === "Active" ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── View Detail Drawer ───────────────────────────────────────────── */}
      {viewUser && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setViewUser(null)}>
          <div className="w-full max-w-lg h-full overflow-y-auto glass-card border-l border-[var(--gold)]/20 p-6 space-y-6" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-foreground">{t("app.admin.customerDetailsTitle","Customer Details")}</h3>
              <button onClick={() => setViewUser(null)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition"><X className="h-5 w-5" /></button>
            </div>

            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center shrink-0">
                <span className="text-gold font-bold text-xl">{viewUser.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground leading-tight">{viewUser.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusStyle[viewUser.status]}`}>{viewUser.status}</span>
                  {viewUser.isVerified
                    ? <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 className="h-3 w-3" />Verified</span>
                    : <span className="flex items-center gap-1 text-[10px] text-amber-400"><XCircle className="h-3 w-3" />Unverified</span>
                  }
                  {viewUser.membership ? (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      viewUser.membership.toLowerCase().includes("silver")
                        ? "bg-slate-400/15 text-slate-300 border-slate-500/20"
                        : "bg-gold/15 text-gold border-gold/25"
                    }`}>
                      {viewUser.membership} Member
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-muted-foreground border border-white/10">
                      Not a Member
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Mail className="h-3.5 w-3.5" />,         label: "Email",    value: viewUser.email },
                { icon: <Phone className="h-3.5 w-3.5" />,        label: "Phone",    value: viewUser.phone || "—" },
                { icon: <CalendarDays className="h-3.5 w-3.5" />, label: "Joined",   value: viewUser.joined },
                { icon: <User className="h-3.5 w-3.5" />,         label: "Customer ID", value: `#${viewUser.id}` },
              ].map(({ icon, label, value }) => (
                <div key={label} className="glass-card rounded-xl p-3 border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">{icon}<span className="text-[10px] uppercase tracking-wide">{label}</span></div>
                  <p className="text-sm text-foreground font-medium truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => toggleBlock(viewUser)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold border transition ${viewUser.status === "Active" ? "border-amber-400/30 text-amber-400 hover:bg-amber-400/10" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}`}>
                {viewUser.status === "Active" ? <><ShieldOff className="h-3.5 w-3.5" />{t("app.admin.blockCustomer","Block Customer")}</> : <><Shield className="h-3.5 w-3.5" />{t("app.admin.unblockCustomer","Unblock Customer")}</>}
              </button>
              {!viewUser.isVerified && (
                <button onClick={resendSetup} disabled={resending || resendDone} className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold border border-[var(--gold)]/30 text-gold hover:bg-[var(--gold)]/10 transition disabled:opacity-60">
                  {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MailCheck className="h-3.5 w-3.5" />}
                  {resendDone ? t("app.admin.emailSentMsg","Email Sent!") : resending ? t("app.admin.sendingLabel","Sending...") : t("app.admin.resendSetupEmail","Resend Setup Email")}
                </button>
              )}
            </div>

            {/* Booking History */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gold" /> {t("app.userDashboard.bookingDetails","Booking History")}
                <span className="ml-auto text-xs text-muted-foreground font-normal">{viewUser.rawBookings?.length ?? viewUser.bookings} bookings</span>
              </h4>

              {detailLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("app.admin.loadingBookingsMsg","Loading bookings...")}
                </div>
              ) : !viewUser.rawBookings?.length ? (
                <div className="text-center py-8 text-sm text-muted-foreground border border-white/[0.06] rounded-xl">{t("app.admin.noBookingsYet","No bookings yet")}</div>
              ) : (
                <div className="space-y-2">
                  {viewUser.rawBookings.map((b: any) => (
                    <div key={b.id} className="glass-card rounded-xl p-3.5 border border-white/[0.06] flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{b.suite}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.eventType} · {b.date} · {b.timeSlot}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Booking {b.orderId ? `#${b.orderId}` : `#VN${b.id}`}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${bookingStatusStyle[b.status] ?? ""}`}>{b.status}</span>
                        <span className="text-xs font-semibold text-gold">₹{Number(b.totalAmount).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ───────────────────────────────────────────── */}
      {editOpen && editUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setEditOpen(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md border border-[var(--gold)]/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg text-foreground">Edit Customer</h3>
              <button onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-foreground transition"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide">Full Name *</label>
                <input value={editForm.fullName} onChange={(e) => { setEditForm((f) => ({ ...f, fullName: e.target.value })); clearEditFieldError("fullName"); }} className={`luxury-input w-full rounded-lg px-3 py-2.5 text-sm mt-0.5 ${editFieldErrors.fullName ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""}`} />
                {editFieldErrors.fullName && <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium"><AlertCircle className="h-3 w-3 shrink-0" /> {editFieldErrors.fullName}</p>}
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide">Phone</label>
                <input value={editForm.phone} onChange={(e) => { setEditForm((f) => ({ ...f, phone: e.target.value })); clearEditFieldError("phone"); }} className={`luxury-input w-full rounded-lg px-3 py-2.5 text-sm mt-0.5 ${editFieldErrors.phone ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""}`} />
                {editFieldErrors.phone && <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium"><AlertCircle className="h-3 w-3 shrink-0" /> {editFieldErrors.phone}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">DOB</label>
                  <input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className="luxury-input w-full rounded-lg px-3 py-2.5 text-sm mt-0.5" style={{ colorScheme: "dark" }} />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">Marriage Date</label>
                  <input type="date" value={editForm.marriageDate} onChange={(e) => setEditForm((f) => ({ ...f, marriageDate: e.target.value }))} className="luxury-input w-full rounded-lg px-3 py-2.5 text-sm mt-0.5" style={{ colorScheme: "dark" }} />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide">Status</label>
                <select value={editForm.isActive ? "Active" : "Blocked"} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === "Active" }))} className="luxury-input w-full rounded-lg px-3 py-2.5 text-sm mt-0.5 bg-transparent">
                  <option value="Active">Active</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
            </div>

            {editError && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mt-2">{editError}</p>}

            <div className="flex gap-3 mt-5">
              <button onClick={saveEdit} disabled={editSaving} className="gold-btn flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-70 flex items-center justify-center gap-2">
                {editSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editSaving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditOpen(false)} className="flex-1 rounded-lg py-2.5 text-sm border border-white/10 text-muted-foreground hover:text-foreground transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete User Confirm ───────────────────────────────────────────── */}
      {deleteOpen && deleteUser && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setDeleteOpen(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md border border-destructive/30" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg text-foreground">Delete Customer</h3>
              <button onClick={() => setDeleteOpen(false)} className="text-muted-foreground hover:text-foreground transition"><X className="h-5 w-5" /></button>
            </div>

            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="text-foreground font-semibold">{deleteUser.name}</span>? This cannot be undone.
            </p>

            {deleteError && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mt-3">{deleteError}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={confirmDelete} disabled={deleteBusy} className="bg-destructive text-white flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-70 flex items-center justify-center gap-2">
                {deleteBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {deleteBusy ? "Deleting..." : "Delete"}
              </button>
              <button onClick={() => setDeleteOpen(false)} className="flex-1 rounded-lg py-2.5 text-sm border border-white/10 text-muted-foreground hover:text-foreground transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Customer Modal ───────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md border border-[var(--gold)]/20">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg text-foreground">{t("app.admin.addCustomerTitle","Add New Customer")}</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground transition"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Full Name *",  key: "name",  type: "text",  placeholder: "e.g. Arjun Sharma" },
                { label: "Email *",      key: "email", type: "email", placeholder: "e.g. user@example.com" },
                { label: "Phone",        key: "phone", type: "tel",   placeholder: "e.g. +91 98765 43210 (optional)" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</label>
                  <input type={type} placeholder={placeholder} value={form[key as keyof typeof form]} onChange={(e) => { setForm((f) => ({ ...f, [key]: e.target.value })); clearFieldError(key); }} className={`luxury-input w-full rounded-lg px-3 py-2.5 text-sm mt-0.5 ${fieldErrors[key] ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""}`} />
                  {fieldErrors[key] && <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium"><AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors[key]}</p>}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5"><MailCheck className="h-3 w-3 text-gold" />{t("app.admin.setupEmailNote","A password setup email will be sent to this customer automatically.")}</p>
            {formError && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mt-2">{formError}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving} className="gold-btn flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-70 flex items-center justify-center gap-2">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{saving ? t("app.admin.sendingLabel","Sending...") : t("app.admin.addCustomerBtn","Add Customer")}
              </button>
              <button onClick={() => setShowAdd(false)} className="flex-1 rounded-lg py-2.5 text-sm border border-white/10 text-muted-foreground hover:text-foreground transition">{t("app.admin.cancel","Cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
