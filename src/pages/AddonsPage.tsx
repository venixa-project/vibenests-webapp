import { useEffect, useMemo, useRef, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Plus, Search, Pencil, Trash2, X, ImagePlus, AlertCircle } from "lucide-react";
import { addonsApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type Addon = {
  id: number;
  name: string;
  category: string;
  price: number;
  status: "active" | "inactive";
  image?: string;
  description: string;
};

const statusStyle: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Inactive: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const emptyForm = {
  name: "",
  category: "Decoration",
  price: "" as string | number,
  status: "active" as Addon["status"],
  image: "" as string,
  description: "",
};



function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${checked ? "bg-[var(--gold)]" : "bg-white/20"}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

export default function AddonsPage() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { t } = useTranslation();
  // const [addons, setAddons] = useState(initialAddons);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fileRef = useRef<HTMLInputElement>(null);
  const [newCatInput, setNewCatInput] = useState("");
  const [allCategories, setAllCategories] = useState<string[]>(["Decoration", "Food & Beverage", "Entertainment", "Media"]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const filtered = useMemo(() => {
    return addons.filter((a) => {
      const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === "All" || a.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [addons, catFilter, search]);

  const fetchAddons = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await addonsApi.getAll();
      // backend returns price as number and status as 'active' | 'inactive'
      setAddons(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load add-ons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setShowModal(true);
  }

  function openEdit(a: Addon) {
    setEditId(a.id);
    setForm({
      name: a.name,
      category: a.category,
      price: a.price,
      status: a.status,
      image: a.image || "",
      description: a.description,
    });
    setFieldErrors({});
    setShowModal(true);
  }

  function parsePrice(input: string | number): number {
    if (typeof input === "number") return input;
    const cleaned = String(input).replace(/[₹\s,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  async function handleSave() {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) {
      errors.name = "Add-on name is required.";
    }
    const parsed = parsePrice(form.price);
    if (!String(form.price).trim() || parsed <= 0) {
      errors.price = "Please enter a valid price (e.g. 500).";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill all required fields correctly.");
      return;
    }

    const payload = {
      ...form,
      price: parsed,
      status: form.status,
    };

    try {
      setLoading(true);
      if (editId) {
        await addonsApi.update(editId, payload);
        toast.success("Add-on updated successfully!");
      } else {
        await addonsApi.create(payload);
        toast.success("Add-on created successfully!");
      }
      setShowModal(false);
      await fetchAddons();
    } catch (e: any) {
      setError(e?.message || "Failed to save add-on");
      toast.error(e?.message || "Failed to save add-on");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Are you sure you want to delete this add-on?")) return;
    try {
      setLoading(true);
      await addonsApi.remove(id);
      toast.success("Add-on deleted successfully!");
      await fetchAddons();
    } catch (e: any) {
      setError(e?.message || "Failed to delete add-on");
      toast.error(e?.message || "Failed to delete add-on");
    } finally {
      setLoading(false);
    }
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, image: ev.target?.result as string }));
    reader.readAsDataURL(file);
    e.target.value = "";
  }


  return (
    <div className="flex-1 overflow-y-auto">
      <AdminHeader title="Add-on Management" />
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap gap-3">
          {[
            { label: t("app.admin.totalAddons", "Total Add-ons"), count: addons.length, color: "border-[var(--gold)]/30 text-gold" },
            { label: t("app.admin.active", "Active"), count: addons.filter((a) => String(a.status).toLowerCase() === "active").length, color: "border-emerald-500/30 text-emerald-400" },
            { label: t("app.admin.inactive", "Inactive"), count: addons.filter((a) => String(a.status).toLowerCase() === "inactive").length, color: "border-amber-500/30 text-amber-400" },
          ].map((s) => (
            <div key={s.label} className={`glass-card rounded-xl px-4 py-2.5 border ${s.color} flex items-center gap-2`}>
              <span className="text-xl font-display font-semibold">{s.count}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input type="text" placeholder={t("app.admin.searchAddons", "Search add-ons...")} value={search} onChange={(e) => setSearch(e.target.value)} className="luxury-input w-full rounded-lg pl-9 pr-4 py-2 text-xs" />
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-[var(--gold)]/10">
            {[t("app.admin.allCategories", "All"), ...allCategories, ...customCategories].map((c, i) => {
              const val = i === 0 ? "All" : c;
              return (
                <button key={c} onClick={() => setCatFilter(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${catFilter === val ? "bg-[var(--gold)]/15 text-gold border border-[var(--gold)]/25" : "text-muted-foreground hover:text-foreground"}`}>
                  {c}
                </button>
              );
            })}
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 gold-btn px-4 py-2 rounded-lg text-xs font-semibold ml-auto">
            <Plus className="h-3.5 w-3.5" /> {t("app.admin.addAddon", "Add Add-on")}
          </button>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-medium text-foreground">{t("app.admin.allAddons", "All Add-ons")}</h3>
            <span className="text-xs text-muted-foreground">{filtered.length} of {addons.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-white/[0.06]">
                  <th className="pb-3 pr-4">{t("app.admin.image", "Image")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.name", "Name")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.category", "Category")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.amount", "Price")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.status", "Status")}</th>
                  <th className="pb-3">{t("app.admin.actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">{t("app.admin.noAddonsFound", "No add-ons found")}</td></tr>
                ) : filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 pr-4">
                      {a.image ? (
                        <img src={a.image} alt={a.name} className="h-10 w-10 rounded-lg object-cover border border-[var(--gold)]/20" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center">
                          <ImagePlus className="h-4 w-4 text-gold/40" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-foreground font-medium">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{a.id}</p>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{a.category}</td>
                    <td className="py-3 pr-4 text-gold font-medium">{a.price}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusStyle[a.status]}`}>
{String(a.status).toLowerCase() === "active" ? t("app.admin.active", "Active") : t("app.admin.inactive", "Inactive")}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-muted-foreground hover:text-gold hover:bg-[var(--gold)]/10 transition"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="glass-card rounded-2xl p-5 w-full max-w-md border border-[var(--gold)]/20 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-foreground">{editId ? t("app.admin.editAddon", "Edit Add-on") : t("app.admin.addNewAddon", "Add New Add-on")}</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.image", "Image")}</label>
                <div className="mt-1 flex items-center gap-3">
                  {form.image ? (
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-[var(--gold)]/20">
                      <img src={form.image} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => setForm((f) => ({ ...f, image: "" }))} className="absolute top-0.5 right-0.5 h-4 w-4 bg-black/70 rounded-full flex items-center justify-center text-white"><X className="h-2.5 w-2.5" /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} className="h-16 w-16 rounded-lg border border-dashed border-[var(--gold)]/30 flex flex-col items-center justify-center gap-1 hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/5 transition">
                      <ImagePlus className="h-5 w-5 text-gold/60" />
                      <span className="text-[9px] text-muted-foreground">{t("app.admin.upload", "Upload")}</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </div>
              </div>
              {[
                { label: t("app.admin.addonName", "Add-on Name"), key: "name", required: true, placeholder: t("app.admin.addonNamePlaceholder", "e.g. Birthday Cake") },
                { label: t("app.admin.priceLabel", "Price"), key: "price", required: true, placeholder: t("app.admin.pricePlaceholder", "e.g. ₹1,200") },
                { label: t("app.admin.description", "Description"), key: "description", required: false, placeholder: t("app.admin.descriptionPlaceholder", "Brief description...") },
              ].map(({ label, key, required, placeholder }) => (
                <div key={key}>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    {label} {required && <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={String(form[key as keyof typeof form] ?? "")}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, [key]: e.target.value }));
                      clearFieldError(key);
                    }}
                    className={`luxury-input w-full rounded-lg px-3 py-2 text-sm mt-0.5 ${
                      fieldErrors[key] ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""
                    }`}
                  />
                  {fieldErrors[key] && (
                    <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors[key]}
                    </p>
                  )}
                </div>
              ))}

              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.category", "Category")}</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="luxury-input w-full rounded-lg px-3 py-2 text-sm mt-0.5 bg-transparent cursor-pointer">
                  {[...allCategories, ...customCategories].map((c) => <option key={c} value={c} className="bg-[oklch(0.13_0.025_260)]">{c}</option>)}
                </select>
                <div className="flex gap-2 mt-2">
                  <input type="text" placeholder={t("app.admin.addNewCategory", "Add new category...")} value={newCatInput} onChange={(e) => setNewCatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t2 = newCatInput.trim(); if (t2 && ![...allCategories, ...customCategories].includes(t2)) { setCustomCategories((p) => [...p, t2]); setForm((f) => ({ ...f, category: t2 })); } setNewCatInput(""); } }}
                    className="luxury-input flex-1 rounded-lg px-3 py-1.5 text-xs" />
                  <button type="button" onClick={() => { const t2 = newCatInput.trim(); if (t2 && ![...allCategories, ...customCategories].includes(t2)) { setCustomCategories((p) => [...p, t2]); setForm((f) => ({ ...f, category: t2 })); } setNewCatInput(""); }} className="px-3 py-1.5 rounded-lg text-xs gold-btn font-medium">+ {t("app.admin.addAmenity", "Add")}</button>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("app.admin.statusLabel", "Status")}</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Addon["status"] }))} className="luxury-input w-full rounded-lg px-3 py-2 text-sm mt-0.5 bg-transparent cursor-pointer">
                  <option value="Active" className="bg-[oklch(0.13_0.025_260)]">{t("app.admin.active", "Active")}</option>
                  <option value="Inactive" className="bg-[oklch(0.13_0.025_260)]">{t("app.admin.inactive", "Inactive")}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} className="gold-btn flex-1 rounded-lg py-2 text-sm font-semibold">{editId ? t("app.admin.saveChanges", "Save Changes") : t("app.admin.addAddon", "Add Add-on")}</button>
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg py-2 text-sm border border-white/10 text-muted-foreground hover:text-foreground transition">{t("app.admin.cancel", "Cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
