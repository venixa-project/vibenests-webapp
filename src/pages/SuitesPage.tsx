import { useState, useRef, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, X, BedDouble, ImagePlus, Check, ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useSuitesContext, type Suite } from "@/components/admin/SuitesContext";
import { suitesApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function generateSlots(startTime: string, endTime: string, durationMins: number, gapMins: number = 30): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let cur = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end < cur) {
    end += 24 * 60;
  }
  const step = durationMins + gapMins;
  while (cur + durationMins <= end) {
    const hh = Math.floor(cur / 60) % 24;
    const mm = cur % 60;
    const period = hh >= 12 ? "PM" : "AM";
    const dh = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
    slots.push(`${String(dh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period}`);
    cur += step;
  }
  return slots;
}

function getEndTime(start: string, durationMins: number): string {
  const [time, period] = start.split(" ");
  const [h, m] = time.split(":").map(Number);
  let totalMin = ((period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h) * 60) + m + durationMins;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  const endPeriod = endH >= 12 ? "PM" : "AM";
  const displayH = endH > 12 ? endH - 12 : endH === 0 ? 12 : endH;
  return `${String(displayH).padStart(2, "0")}:${String(endM).padStart(2, "0")} ${endPeriod}`;
}

const emptyForm: Omit<Suite, "id"> = { name: "", minCapacity: 1, capacity: 2, price: "", ratePerExtraPerson: 199, baseDiscount: 0, slotStartTime: "09:00", slotEndTime: "21:00", slotDurationMins: 150, gapBetweenSlotsMins: 30, occasions: "", status: "Active", description: "", images: [], amenities: [] };

const statusStyle: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Inactive: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

function AmenitiesEditor({ amenities, onChange }: { amenities: string[]; onChange: (a: string[]) => void }) {
  const [newVal, setNewVal] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const { t } = useTranslation();

  function addAmenity() {
    const trimmed = newVal.trim();
    if (!trimmed || amenities.includes(trimmed)) return;
    onChange([...amenities, trimmed]);
    setNewVal("");
  }

  function saveEdit(idx: number) {
    const trimmed = editVal.trim();
    if (!trimmed) return;
    onChange(amenities.map((a, i) => (i === idx ? trimmed : a)));
    setEditIdx(null);
  }

  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("app.admin.amenities", "Amenities")}</label>
      <div className="mt-1.5 space-y-1.5">
        {amenities.map((a, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03]">
            {editIdx === i ? (
              <>
                <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(i); if (e.key === "Escape") setEditIdx(null); }}
                  className="luxury-input flex-1 rounded-md px-2 py-0.5 text-xs" />
                <button type="button" onClick={() => saveEdit(i)} className="p-1 rounded text-emerald-400 hover:bg-emerald-400/10 transition"><Check className="h-3 w-3" /></button>
                <button type="button" onClick={() => setEditIdx(null)} className="p-1 rounded text-muted-foreground hover:text-foreground transition"><X className="h-3 w-3" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-xs text-foreground">{a}</span>
                <button type="button" onClick={() => { setEditIdx(i); setEditVal(a); }}
                  className="p-1 rounded text-gold/60 hover:text-gold hover:bg-[var(--gold)]/10 transition"><Pencil className="h-3 w-3" /></button>
                <button type="button" onClick={() => onChange(amenities.filter((_, idx) => idx !== i))}
                  className="p-1 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition"><Trash2 className="h-3 w-3" /></button>
              </>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <input value={newVal} onChange={(e) => setNewVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAmenity(); } }}
            placeholder={t("app.admin.addAmenityPlaceholder", "Add amenity (e.g. WiFi)")} className="luxury-input flex-1 rounded-lg px-3 py-1.5 text-xs" />
          <button type="button" onClick={addAmenity}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-[var(--gold)]/30 text-gold hover:bg-[var(--gold)]/10 transition">
            <Plus className="h-3 w-3" /> {t("app.admin.addAmenity", "Add")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageSlider({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) {
    return (
      <div className="h-44 bg-white/[0.03] flex items-center justify-center border-b border-white/[0.05]">
        <BedDouble className="h-10 w-10 text-[var(--gold)]/30" />
      </div>
    );
  }
  return (
    <div className="relative h-44 overflow-hidden group">
      <img src={images[idx]} alt={name} className="w-full h-full object-cover transition-opacity duration-300" />
      {images.length > 1 && (
        <>
          <button onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-black/70">
            <ChevronLeft className="h-3.5 w-3.5 text-white" />
          </button>
          <button onClick={() => setIdx((i) => (i + 1) % images.length)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-black/70">
            <ChevronRight className="h-3.5 w-3.5 text-white" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ManageSuiteAvailabilityModal({ suite, onClose }: { suite: Suite; onClose: () => void }) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<{ bookings: any[]; blocks: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blockingSlot, setBlockingSlot] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const loadData = () => {
    if (!date) return;
    setLoading(true);
    setError("");
    suitesApi.getAvailabilityDetails(suite.id, date)
      .then((res) => {
        setData(res);
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load availability details.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [date, suite.id]);

  const handleAddBlock = async (slot: string) => {
    try {
      setError("");
      await suitesApi.addBlock(suite.id, { date, timeSlot: slot, note: note.trim() || undefined });
      setBlockingSlot(null);
      setNote("");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to block slot.");
    }
  };

  const handleRemoveBlock = async (blockId: number) => {
    try {
      setError("");
      await suitesApi.removeBlock(suite.id, blockId);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to remove block.");
    }
  };

  const slots = generateSlots(
    suite.slotStartTime,
    suite.slotEndTime,
    suite.slotDurationMins,
    suite.gapBetweenSlotsMins
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="glass-card rounded-2xl p-5 w-full max-w-lg border border-[var(--gold)]/20 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Manage Slot Availability</h3>
            <p className="text-xs text-gold mt-0.5">{suite.name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
          <Calendar className="h-4 w-4 text-gold shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Select Date</p>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setBlockingSlot(null);
                setNote("");
              }}
              className="luxury-input w-full bg-transparent border-0 p-0 text-sm focus:ring-0 mt-0.5"
              style={{ colorScheme: "dark" }}
            />
          </div>
        </div>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">Loading slot details...</div>
        ) : (
          <div className="space-y-2.5">
            <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
              {slots.length} Slots · {suite.slotDurationMins}m Duration · {suite.gapBetweenSlotsMins}m Gap
            </h4>

            {slots.length === 0 ? (
              <p className="text-xs text-rose-400">No slots defined for this suite's settings.</p>
            ) : (
              <div className="space-y-2">
                {slots.map((slot) => {
                  const booking = data?.bookings.find((b: any) => b.timeSlot === slot);
                  const block = data?.blocks.find((b: any) => b.timeSlot === slot);
                  const isBooked = !!booking;
                  const isBlocked = !!block;
                  const end = getEndTime(slot, suite.slotDurationMins);

                  return (
                    <div
                      key={slot}
                      className={`flex flex-col p-3 rounded-xl border transition-all
                        ${isBooked
                          ? "border-blue-500/20 bg-blue-500/[0.02]"
                          : isBlocked
                            ? "border-amber-500/20 bg-amber-500/[0.02]"
                            : "border-white/5 bg-white/[0.01]"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-gold shrink-0" />
                          <span className="text-xs font-semibold text-foreground">{slot} – {end}</span>
                        </div>

                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border
                          ${isBooked
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                            : isBlocked
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {isBooked ? "Booked" : isBlocked ? "Blocked" : "Available"}
                        </span>
                      </div>

                      {/* Details or Actions */}
                      {isBooked && (
                        <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5 border-t border-white/5 pt-2 pl-5">
                          <p>
                            <span className="text-foreground font-medium">Guest:</span> {booking.guestFirstName} {booking.guestLastName}
                          </p>
                          <p>
                            <span className="text-foreground font-medium">Contact:</span> {booking.guestEmail} · {booking.guestPhone}
                          </p>
                          <p>
                            <span className="text-foreground font-medium">Booking ID:</span> {booking.orderId ? `#${booking.orderId}` : `#VN${booking.id}`} · <span className="capitalize">{booking.status}</span>
                          </p>
                        </div>
                      )}

                      {isBlocked && (
                        <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between border-t border-white/5 pt-2 pl-5">
                          <p className="italic">
                            <span className="text-foreground font-medium not-italic">Note:</span> {block.note || "No block note"}
                          </p>
                          <button
                            onClick={() => handleRemoveBlock(block.id)}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold border border-rose-500/30 rounded-lg px-2 py-0.5 hover:bg-rose-500/10 transition"
                          >
                            Unblock
                          </button>
                        </div>
                      )}

                      {!isBooked && !isBlocked && (
                        <div className="mt-2 flex flex-col gap-2 border-t border-white/5 pt-2">
                          {blockingSlot === slot ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Optional block note..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="luxury-input flex-1 rounded-lg px-2.5 py-1 text-xs"
                                onKeyDown={(e) => e.key === "Enter" && handleAddBlock(slot)}
                              />
                              <button
                                onClick={() => handleAddBlock(slot)}
                                className="gold-btn rounded-lg px-3 py-1 text-xs font-semibold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setBlockingSlot(null); setNote(""); }}
                                className="border border-white/15 hover:text-foreground text-muted-foreground rounded-lg px-2.5 py-1 text-xs transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setBlockingSlot(slot); setNote(""); }}
                              className="text-[10px] text-gold hover:text-white font-semibold border border-gold/20 rounded-lg py-1 hover:bg-gold/10 transition text-center self-end px-3.5"
                            >
                              Block Slot
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-white/5">
          <button
            onClick={onClose}
            className="border border-white/10 text-muted-foreground hover:text-foreground rounded-xl px-4 py-2 text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuitesPage() {
  const { suites, setSuites, saveSuite, deleteSuite: apiDelete, loading } = useSuitesContext();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);
  const [availabilitySuite, setAvailabilitySuite] = useState<Suite | null>(null);

  const filtered = suites.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function openAdd() { setEditId(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(s: Suite) { setEditId(s.id); setForm({ name: s.name, minCapacity: s.minCapacity, capacity: s.capacity, price: s.price, ratePerExtraPerson: s.ratePerExtraPerson, baseDiscount: s.baseDiscount, slotStartTime: s.slotStartTime, slotEndTime: s.slotEndTime, slotDurationMins: s.slotDurationMins, gapBetweenSlotsMins: s.gapBetweenSlotsMins, occasions: s.occasions, status: s.status, description: s.description, images: s.images, amenities: s.amenities }); setShowModal(true); }

  async function handleSave() {
    if (!form.name.trim()) return;
    try {
      await saveSuite(form, editId);
      setShowModal(false);
      toast.success(editId ? "Suite updated successfully!" : "Suite created successfully!");
    } catch (err: any) {
      toast.error(err.message || 'Failed to save suite');
    }
  }

  async function handleDelete(id: string) {
    try { 
      await apiDelete(id); 
      toast.success("Suite deleted successfully!");
    } catch (err: any) { 
      toast.error(err.message || 'Failed to delete suite'); 
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setForm((f) => ({ ...f, images: [...f.images, ev.target?.result as string] }));
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <AdminHeader title="Rooms" />
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap gap-3">
          {[
            { label: t("app.admin.totalSuites", "Total Suites"), count: suites.length, color: "border-[var(--gold)]/30 text-gold" },
            { label: t("app.admin.active", "Active"), count: suites.filter(s => s.status === "Active").length, color: "border-emerald-500/30 text-emerald-400" },
            { label: t("app.admin.inactive", "Inactive"), count: suites.filter(s => s.status === "Inactive").length, color: "border-amber-500/30 text-amber-400" },
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
            <input type="text" placeholder={t("app.admin.search", "Search suites...")} value={search} onChange={(e) => setSearch(e.target.value)} className="luxury-input w-full rounded-lg pl-9 pr-4 py-2 text-xs" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="luxury-input rounded-lg px-3 py-2 text-xs text-foreground bg-transparent cursor-pointer">
            {["All", "Active", "Inactive"].map((s) => <option key={s} value={s} className="bg-[oklch(0.13_0.025_260)]">{s === "All" ? t("app.admin.allStatuses", "All Statuses") : s === "Active" ? t("app.admin.active", "Active") : t("app.admin.inactive", "Inactive")}</option>)}
          </select>
          <button onClick={openAdd} className="flex items-center gap-2 gold-btn px-4 py-2 rounded-lg text-xs font-semibold ml-auto">
            <Plus className="h-3.5 w-3.5" /> {t("app.admin.addSuite", "Add Suite")}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 py-16 text-center text-sm text-muted-foreground">{t("app.admin.loadingSuites", "Loading suites...")}</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-3 py-16 text-center text-sm text-muted-foreground">{t("app.admin.noSuitesFound", "No suites found")}</div>
          ) : filtered.map((s) => (
            <div key={s.id} className="glass-card rounded-2xl overflow-hidden flex flex-col border border-[var(--gold)]/10">
              <ImageSlider images={s.images} name={s.name} />
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-medium text-foreground leading-tight">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.id}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 ${statusStyle[s.status]}`}>{s.status}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <p className="text-muted-foreground">{t("app.admin.minCapacity", "Min Capacity")}</p>
                    <p className="text-foreground font-medium mt-0.5">{s.minCapacity} {t("app.admin.guest", "guests")}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <p className="text-muted-foreground">{t("app.admin.maxCapacity", "Max Capacity")}</p>
                    <p className="text-foreground font-medium mt-0.5">{s.capacity} {t("app.admin.guest", "guests")}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <p className="text-muted-foreground">{t("app.admin.baseRate", "Base Rate")}</p>
                    <p className="text-gold font-medium mt-0.5">{s.price}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <p className="text-muted-foreground">{t("app.admin.extraPerPerson", "Extra/Person")}</p>
                    <p className="text-foreground font-medium mt-0.5">₹{s.ratePerExtraPerson}</p>
                  </div>
                  {s.baseDiscount > 0 && (
                    <div className="col-span-2 bg-emerald-500/5 rounded-lg px-3 py-2">
                      <p className="text-muted-foreground">{t("app.admin.discount", "Discount")}</p>
                      <p className="text-emerald-400 font-medium mt-0.5">{t("app.admin.discountOffBase", "{{val}}% off base rate", { val: s.baseDiscount })}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border border-[var(--gold)]/20 text-gold hover:bg-[var(--gold)]/10 transition">
                    <Pencil className="h-3.5 w-3.5" /> {t("app.admin.edit", "Edit")}
                  </button>
                  <button onClick={() => setAvailabilitySuite(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border border-[var(--gold)]/20 text-gold hover:bg-[var(--gold)]/10 transition">
                    <Calendar className="h-3.5 w-3.5" /> Slots
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border border-destructive/20 text-destructive hover:bg-destructive/10 transition">
                    <Trash2 className="h-3.5 w-3.5" /> {t("app.admin.delete", "Delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="glass-card rounded-2xl p-4 w-full max-w-md border border-[var(--gold)]/20 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg text-foreground">{editId ? t("app.admin.editSuite", "Edit Suite") : t("app.admin.addNewSuite", "Add New Suite")}</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("app.admin.image", "Images")}</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-[var(--gold)]/20">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))} className="absolute top-0.5 right-0.5 h-4 w-4 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-destructive transition">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => fileRef.current?.click()} className="h-16 w-16 rounded-lg border border-dashed border-[var(--gold)]/30 flex flex-col items-center justify-center gap-1 hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/5 transition">
                    <ImagePlus className="h-5 w-5 text-gold/60" />
                    <span className="text-[9px] text-muted-foreground">{t("app.admin.addAmenity", "Add")}</span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </div>
              </div>
              {[
                { label: t("app.admin.suiteName", "Suite Name"), key: "name", placeholder: t("app.admin.suiteNamePlaceholder", "e.g. Royal Celebration Suite") },
                { label: t("app.admin.priceLabel", "Price"), key: "price", placeholder: t("app.admin.pricePlaceholder", "e.g. ₹8,500") },
                { label: t("app.admin.occasionsLabel", "Occasions"), key: "occasions", placeholder: t("app.admin.occasionsPlaceholder", "e.g. Birthday, Anniversary") },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</label>
                  <input type="text" placeholder={placeholder} value={form[key as keyof typeof form] as string} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="luxury-input w-full rounded-lg px-3 py-1.5 text-sm mt-0.5" />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("app.admin.minCapacityLabel", "Min Capacity (guests)")}</label>
                <input type="number" min={1} value={form.minCapacity} onChange={(e) => setForm((f) => ({ ...f, minCapacity: Number(e.target.value) }))} className="luxury-input w-full rounded-lg px-3 py-1.5 text-sm mt-0.5" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("app.admin.maxCapacityLabel", "Max Capacity (guests)")}</label>
                <input type="number" min={form.minCapacity} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))} className="luxury-input w-full rounded-lg px-3 py-1.5 text-sm mt-0.5" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("app.admin.ratePerExtraPerson", "Rate / Extra Person (₹)")}</label>
                  <input type="number" min={0} value={form.ratePerExtraPerson} onChange={(e) => setForm((f) => ({ ...f, ratePerExtraPerson: Number(e.target.value) }))} className="luxury-input w-full rounded-lg px-3 py-1.5 text-sm mt-0.5" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("app.admin.discountOnBase", "Discount on Base (%)")}</label>
                  <input type="number" min={0} max={100} value={form.baseDiscount} onChange={(e) => setForm((f) => ({ ...f, baseDiscount: Number(e.target.value) }))} className="luxury-input w-full rounded-lg px-3 py-1.5 text-sm mt-0.5" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("app.admin.description", "Description")}</label>
                <textarea rows={2} placeholder={t("app.admin.descriptionPlaceholder", "Brief description...")} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="luxury-input w-full rounded-lg px-3 py-1.5 text-sm mt-0.5 resize-none" />
              </div>
              <AmenitiesEditor amenities={form.amenities} onChange={(a) => setForm((f) => ({ ...f, amenities: a }))} />
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("app.admin.timeSlotSettings", "Time Slot Settings")}</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">{t("app.admin.startTime", "Start Time")}</label>
                    <input type="time" value={form.slotStartTime} onChange={(e) => setForm((f) => ({ ...f, slotStartTime: e.target.value }))} className="luxury-input w-full rounded-lg px-3 py-1.5 text-sm mt-0.5" style={{ colorScheme: "dark" }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">{t("app.admin.endTime", "End Time")}</label>
                    <input type="time" value={form.slotEndTime} onChange={(e) => setForm((f) => ({ ...f, slotEndTime: e.target.value }))} className="luxury-input w-full rounded-lg px-3 py-1.5 text-sm mt-0.5" style={{ colorScheme: "dark" }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">{t("app.admin.slotDurationMins", "Slot Duration (minutes)")}</label>
                    <input type="number" min={30} step={15} value={form.slotDurationMins} onChange={(e) => setForm((f) => ({ ...f, slotDurationMins: Number(e.target.value) }))} className="luxury-input w-full rounded-lg px-3 py-1.5 text-sm mt-0.5" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">{t("app.admin.gapBetweenSlotsMins", "Gap Between Slots (minutes)")}</label>
                    <input type="number" min={0} step={5} value={form.gapBetweenSlotsMins} onChange={(e) => setForm((f) => ({ ...f, gapBetweenSlotsMins: Number(e.target.value) }))} className="luxury-input w-full rounded-lg px-3 py-1.5 text-sm mt-0.5" />
                  </div>
                </div>
                {/* Preview generated slots */}
                {form.slotStartTime && form.slotEndTime && form.slotDurationMins >= 30 && (() => {
                  const slots: string[] = [];
                  const [sh, sm] = form.slotStartTime.split(":").map(Number);
                  const [eh, em] = form.slotEndTime.split(":").map(Number);
                  let cur = sh * 60 + sm;
                  let end = eh * 60 + em;
                  if (end < cur) {
                    end += 24 * 60;
                  }
                  const gapMins = form.gapBetweenSlotsMins ?? 30;
                  const step = form.slotDurationMins + gapMins;
                  while (cur + form.slotDurationMins <= end) {
                    const hh = Math.floor(cur / 60) % 24;
                    const mm = cur % 60;
                    const period = hh >= 12 ? "PM" : "AM";
                    const dh = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
                    slots.push(`${String(dh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period}`);
                    cur += step;
                  }
                  return slots.length > 0 ? (
                    <div className="mt-2">
                      <p className="text-[10px] text-muted-foreground mb-1">{slots.length} {t("app.admin.slotsOf", "slots")} · {form.slotDurationMins} {t("app.admin.minEach", "min each")} · {t("app.admin.minGapDynamic", `${gapMins} min gap`, { gap: gapMins })}</p>
                      <div className="flex flex-wrap gap-1">
                        {slots.map((s) => <span key={s} className="px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-[10px] text-gold">{s}</span>)}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("app.admin.statusLabel", "Status")}</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Suite["status"] }))} className="luxury-input w-full rounded-lg px-3 py-1.5 text-sm mt-0.5 bg-transparent cursor-pointer">
                  <option value="Active" className="bg-[oklch(0.13_0.025_260)]">{t("app.admin.active", "Active")}</option>
                  <option value="Inactive" className="bg-[oklch(0.13_0.025_260)]">{t("app.admin.inactive", "Inactive")}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} className="gold-btn flex-1 rounded-lg py-2 text-sm font-semibold">{editId ? t("app.admin.saveChanges", "Save Changes") : t("app.admin.addSuite", "Add Suite")}</button>
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg py-2 text-sm border border-white/10 text-muted-foreground hover:text-foreground transition">{t("app.admin.cancel", "Cancel")}</button>
            </div>
          </div>
        </div>
      )}
      {availabilitySuite && (
        <ManageSuiteAvailabilityModal
          suite={availabilitySuite}
          onClose={() => setAvailabilitySuite(null)}
        />
      )}
    </div>
  );
}
