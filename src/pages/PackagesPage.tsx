import { useState, useRef } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useSuitesContext } from "@/components/admin/SuitesContext";
import {
  Plus, Search, Pencil, Trash2, X, Copy, ImagePlus,
  Package, Users, IndianRupee, CalendarDays, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type Amenity = string;
const AMENITY_OPTIONS: Amenity[] = ["Balloons", "Cake", "Decoration", "Music", "LED Lights"];
const TIERS = ["Silver", "Gold", "Platinum", "Diamond"] as const;
const TIER_COLORS: Record<string, string> = {
  Silver: "text-slate-300 border-slate-400/30 bg-slate-400/10",
  Gold: "text-[#FFB800] border-[#FFB800]/30 bg-[#FFB800]/10",
  Platinum: "text-cyan-300 border-cyan-400/30 bg-cyan-400/10",
  Diamond: "text-purple-300 border-purple-400/30 bg-purple-400/10",
};

type Package = {
  id: string;
  name: string;
  tier: typeof TIERS[number];
  minParties: number;
  maxParties: number;
  amount: number;
  occasion: string;
  description: string;
  amenities: Amenity[];
  image: string;
  status: "Active" | "Inactive";
  bookings: number;
};

const initialPackages: Package[] = [
  { id: "PKG001", name: "Silver Celebration", tier: "Silver", minParties: 2, maxParties: 10, amount: 3500, occasion: "Birthday", description: "A delightful starter package with essential celebration elements.", amenities: ["Balloons", "Cake"], image: "", status: "Active", bookings: 24 },
  { id: "PKG002", name: "Gold Festivity", tier: "Gold", minParties: 4, maxParties: 20, amount: 6500, occasion: "Anniversary", description: "Premium gold package with full decoration and music setup.", amenities: ["Balloons", "Cake", "Decoration", "Music"], image: "", status: "Active", bookings: 38 },
  { id: "PKG003", name: "Platinum Luxe", tier: "Platinum", minParties: 6, maxParties: 30, amount: 11000, occasion: "Proposal", description: "Luxurious platinum experience with LED ambience and full setup.", amenities: ["Balloons", "Cake", "Decoration", "Music", "LED Lights"], image: "", status: "Active", bookings: 17 },
  { id: "PKG004", name: "Diamond Elite", tier: "Diamond", minParties: 10, maxParties: 50, amount: 18500, occasion: "Engagement", description: "The ultimate diamond package for grand celebrations.", amenities: ["Cake", "Decoration", "Music", "LED Lights"], image: "", status: "Inactive", bookings: 9 },
];

const emptyForm: Omit<Package, "id" | "bookings"> = {
  name: "", tier: "Silver", minParties: 2, maxParties: 10,
  amount: 0, occasion: "Birthday", description: "",
  amenities: [], image: "", status: "Active",
};

const PAGE_SIZE = 4;

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="font-display text-xl font-semibold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function PackagesPage() {
  const { suites } = useSuitesContext();
  const { t } = useTranslation();
  const occasions = Array.from(
    new Set(suites.flatMap((s) => s.occasions.split(",").map((o) => o.trim()).filter(Boolean)))
  );

  const [packages, setPackages] = useState<Package[]>(initialPackages);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Default");
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = packages
    .filter((p) => {
      const q = search.toLowerCase();
      return (
        (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) &&
        (statusFilter === "All" || p.status === statusFilter)
      );
    })
    .sort((a, b) => {
      if (sortBy === "Amount ↑") return a.amount - b.amount;
      if (sortBy === "Amount ↓") return b.amount - a.amount;
      if (sortBy === "Name") return a.name.localeCompare(b.name);
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalBookings = packages.reduce((s, p) => s + p.bookings, 0);
  const revenue = packages.filter((p) => p.status === "Active").reduce((s, p) => s + p.amount * p.bookings, 0);

  function openAdd() {
    setEditId(null); setForm(emptyForm); setErrors({}); setPanelOpen(true);
  }
  function openEdit(p: Package) {
    setEditId(p.id);
    setForm({ name: p.name, tier: p.tier, minParties: p.minParties, maxParties: p.maxParties, amount: p.amount, occasion: p.occasion, description: p.description, amenities: [...p.amenities], image: p.image, status: p.status });
    setErrors({}); setPanelOpen(true);
  }
  function duplicate(p: Package) {
    const newId = `PKG${String(packages.length + 1).padStart(3, "0")}`;
    setPackages((prev) => [...prev, { ...p, id: newId, name: `${p.name} (Copy)`, bookings: 0 }]);
    toast.success("Package duplicated successfully!");
  }
  function deletePackage(id: string) {
    if (!window.confirm("Are you sure you want to delete this package?")) return;
    setPackages((prev) => prev.filter((p) => p.id !== id));
    toast.success("Package deleted successfully!");
  }

  function validate() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.amount <= 0) e.amount = "Enter a valid amount";
    if (form.minParties < 1) e.minParties = "Min ≥ 1";
    if (form.maxParties < form.minParties) e.maxParties = "Max ≥ Min";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    if (editId) {
      setPackages((prev) => prev.map((p) => p.id === editId ? { ...p, ...form } : p));
      toast.success("Package updated successfully!");
    } else {
      const newId = `PKG${String(packages.length + 1).padStart(3, "0")}`;
      setPackages((prev) => [...prev, { id: newId, bookings: 0, ...form }]);
      toast.success("Package created successfully!");
    }
    setPanelOpen(false);
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, image: ev.target?.result as string }));
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const [newItem, setNewItem] = useState("");

  function addItem() {
    const v = newItem.trim();
    if (!v || form.amenities.includes(v)) return;
    setForm((f) => ({ ...f, amenities: [...f.amenities, v] }));
    setNewItem("");
  }

  function removeItem(a: string) {
    setForm((f) => ({ ...f, amenities: f.amenities.filter((x) => x !== a) }));
  }

  function toggleAmenity(a: Amenity) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <AdminHeader title="Celebration Packages" />

      <div className="p-4 sm:p-6 space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">Create and manage celebration packages</p>
          </div>
          <button onClick={openAdd} className="gold-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold">
            <Plus className="h-4 w-4" /> Add New Package
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard icon={Package} label={t("app.admin.totalPackages","Total Packages")} value={packages.length} color="bg-[var(--gold)]/10 text-gold" />
          <StatCard icon={Package} label={t("app.admin.activePackages","Active Packages")} value={packages.filter((p) => p.status === "Active").length} color="bg-emerald-500/10 text-emerald-400" />
          <StatCard icon={CalendarDays} label={t("app.admin.bookingsThisMonth","Bookings This Month")} value={totalBookings} color="bg-blue-500/10 text-blue-400" />
          <StatCard icon={IndianRupee} label={t("app.admin.revenueThisMonth","Revenue This Month")} value={`₹${(revenue / 1000).toFixed(1)}L`} color="bg-purple-500/10 text-purple-400" />
        </div>

        {/* Main split layout */}
        <div className={`flex gap-5 transition-all duration-300 ${panelOpen ? "items-start" : ""}`}>

          {/* Table side */}
          <div className={`flex-1 min-w-0 space-y-4 transition-all duration-300`}>
            {/* Filters */}
            <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-44">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input type="text" placeholder={t("app.admin.searchPackages","Search packages...")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="luxury-input w-full rounded-lg pl-9 pr-4 py-2 text-xs" />
              </div>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="luxury-input rounded-lg px-3 py-2 text-xs bg-transparent cursor-pointer">
                {["All", "Active", "Inactive"].map((s) => <option key={s} value={s} className="bg-[oklch(0.13_0.025_260)]">{s === "All" ? t("app.admin.allStatuses","All Statuses") : s === "Active" ? t("app.admin.active","Active") : t("app.admin.inactive","Inactive")}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="luxury-input rounded-lg px-3 py-2 text-xs bg-transparent cursor-pointer">
                {["Default", "Name", "Amount ↑", "Amount ↓"].map((s) => <option key={s} value={s} className="bg-[oklch(0.13_0.025_260)]">{s}</option>)}
              </select>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {paginated.length === 0 ? (
                <div className="glass-card rounded-2xl py-16 text-center text-sm text-muted-foreground">{t("app.admin.noPackagesFound","No packages found")}</div>
              ) : paginated.map((p) => (
                <div key={p.id} className="glass-card rounded-2xl border border-[var(--gold)]/10 hover:border-[var(--gold)]/25 transition-all duration-200 overflow-hidden">
                  <div className="flex gap-4 p-4">
                    {/* Image */}
                    <div className="h-20 w-20 rounded-xl overflow-hidden shrink-0 bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <Package className="h-8 w-8 text-[var(--gold)]/30" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-display text-base font-medium text-foreground">{p.name}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TIER_COLORS[p.tier]}`}>{p.tier}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${p.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{p.status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-gold hover:bg-[var(--gold)]/10 transition"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => duplicate(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-400 hover:bg-blue-400/10 transition"><Copy className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deletePackage(p.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-2.5 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3 w-3" /> {p.minParties}–{p.maxParties} guests</span>
                        <span className="flex items-center gap-1 text-gold font-medium"><IndianRupee className="h-3 w-3" />₹{p.amount.toLocaleString("en-IN")}</span>
                        <span className="text-muted-foreground">{p.occasion}</span>
                        <span className="text-muted-foreground">{p.bookings} bookings</span>
                      </div>

                      {p.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {p.amenities.map((a) => (
                            <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-gold">{a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-white/[0.06] disabled:opacity-30 transition"><ChevronLeft className="h-4 w-4" /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setPage(n)} className={`h-7 w-7 rounded-lg text-xs transition ${n === page ? "bg-[var(--gold)]/20 text-gold border border-[var(--gold)]/30" : "hover:bg-white/[0.06]"}`}>{n}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-white/[0.06] disabled:opacity-30 transition"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          {/* Form Panel */}
          {panelOpen && (
            <div className="w-full max-w-sm shrink-0 glass-card rounded-2xl border border-[var(--gold)]/20 overflow-hidden flex flex-col max-h-[calc(100vh-10rem)] sticky top-6">
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h3 className="font-display text-base font-semibold text-foreground">{editId ? t("app.admin.editPackage","Edit Package") : t("app.admin.addNewPackage","Add New Package")}</h3>
                <button onClick={() => setPanelOpen(false)} className="text-muted-foreground hover:text-foreground transition"><X className="h-5 w-5" /></button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                {/* Image upload */}
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.packageImage","Package Image")}</label>
                  <div className="mt-1.5">
                    {form.image ? (
                      <div className="relative h-32 rounded-xl overflow-hidden border border-[var(--gold)]/20">
                        <img src={form.image} alt="" className="h-full w-full object-cover" />
                        <button onClick={() => setForm((f) => ({ ...f, image: "" }))} className="absolute top-1.5 right-1.5 h-6 w-6 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-destructive transition">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileRef.current?.click()} className="w-full h-24 rounded-xl border border-dashed border-[var(--gold)]/30 flex flex-col items-center justify-center gap-1.5 hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/5 transition">
                        <ImagePlus className="h-6 w-6 text-gold/50" />
                        <span className="text-xs text-muted-foreground">{t("app.admin.upload","Click to upload image")}</span>
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.packageName","Package Name")}</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Gold Festivity" className="luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1" />
                  {errors.name && <p className="text-[11px] text-destructive mt-0.5">{errors.name}</p>}
                </div>

                {/* Tier */}
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.packageTier","Package Tier")}</label>
                  <select value={form.tier} onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value as typeof TIERS[number] }))} className="luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1 bg-transparent cursor-pointer">
                    {TIERS.map((t) => <option key={t} value={t} className="bg-[oklch(0.13_0.025_260)]">{t}</option>)}
                  </select>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.minParties","Min Parties")}</label>
                    <input type="number" min={1} value={form.minParties} onChange={(e) => setForm((f) => ({ ...f, minParties: Number(e.target.value) }))} className="luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1" />
                    {errors.minParties && <p className="text-[11px] text-destructive mt-0.5">{errors.minParties}</p>}
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.maxParties","Max Parties")}</label>
                    <input type="number" min={1} value={form.maxParties} onChange={(e) => setForm((f) => ({ ...f, maxParties: Number(e.target.value) }))} className="luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1" />
                    {errors.maxParties && <p className="text-[11px] text-destructive mt-0.5">{errors.maxParties}</p>}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.amountLabel","Amount (₹)")}</label>
                  <input type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} placeholder="e.g. 6500" className="luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1" />
                  {errors.amount && <p className="text-[11px] text-destructive mt-0.5">{errors.amount}</p>}
                </div>

                {/* Occasion */}
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.occasionApplicable","Occasion Applicable")}</label>
                  <select value={form.occasion} onChange={(e) => setForm((f) => ({ ...f, occasion: e.target.value }))} className="luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1 bg-transparent cursor-pointer">
                    {occasions.map((o) => <option key={o} value={o} className="bg-[oklch(0.13_0.025_260)]">{o}</option>)}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.shortDescription","Short Description")}</label>
                  <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description..." className="luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1 resize-none" />
                </div>

                {/* Included Items */}
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.includedItems","Included Items")}</label>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
                      placeholder="e.g. Balloons"
                      className="luxury-input flex-1 rounded-lg px-3 py-1.5 text-sm"
                    />
                    <button type="button" onClick={addItem} className="gold-btn px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {form.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.amenities.map((a) => (
                        <span key={a} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-gold text-xs">
                          {a}
                          <button type="button" onClick={() => removeItem(a)} className="ml-0.5 hover:text-destructive transition">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.statusLabel","Status")}</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "Active" | "Inactive" }))} className="luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1 bg-transparent cursor-pointer">
                    <option value="Active" className="bg-[oklch(0.13_0.025_260)]">{t("app.admin.active","Active")}</option>
                    <option value="Inactive" className="bg-[oklch(0.13_0.025_260)]">{t("app.admin.inactive","Inactive")}</option>
                  </select>
                </div>
              </div>

              {/* Panel footer */}
              <div className="px-5 py-4 border-t border-white/[0.06] flex gap-3">
                <button onClick={handleSave} className="gold-btn flex-1 rounded-xl py-2.5 text-sm font-semibold">
                  {editId ? t("app.admin.saveChanges","Save Changes") : t("app.admin.savePackage","Save Package")}
                </button>
                <button onClick={() => setPanelOpen(false)} className="flex-1 rounded-xl py-2.5 text-sm border border-white/10 text-muted-foreground hover:text-foreground transition">
                  {t("app.admin.cancel","Cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
