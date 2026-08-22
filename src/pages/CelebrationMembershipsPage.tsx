import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { membershipsApi, suitesApi } from "@/lib/api";
import { Edit3, CheckCircle, XCircle, Search, Calendar, CreditCard, User, Award, ShieldAlert, Check, Plus, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface MembershipPlanType {
  id: number;
  name: string;
  price: number;
  validityType?: "monthly" | "quarterly" | "half-yearly" | "yearly" | "custom";
  validityDays: number;
  maxFreeBookings?: number;
  eligibleSuites?: string[];
  discountPercent: number;
  benefits?: string[] | string;
  terms?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}

interface UserMembershipType {
  id: number;
  userId: number;
  planId?: number;
  planName: string;
  maxFreeBookings?: number;
  bookingsUsed?: number;
  eligibleSuites?: string[];
  activationDate: string;
  expiryDate: string;
  status: "active" | "expired" | "inactive";
  paymentId?: string;
  paymentStatus: string;
  amountPaid: number;
  createdAt: string;
  user?: {
    fullName: string;
    email: string;
    phone?: string;
  };
}

export default function CelebrationMembershipsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"plans" | "purchases">("plans");
  
  // Plans states
  const [plans, setPlans] = useState<MembershipPlanType[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  
  // Purchases states
  const [purchases, setPurchases] = useState<UserMembershipType[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "inactive">("all");
  
  // Suites state
  const [allSuites, setAllSuites] = useState<any[]>([]);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("edit");
  const [editName, setEditName] = useState<string>("Silver");
  const [editingPlan, setEditingPlan] = useState<MembershipPlanType | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editValidityType, setEditValidityType] = useState<"monthly" | "quarterly" | "half-yearly" | "yearly" | "custom">("yearly");
  const [editValidity, setEditValidity] = useState("");
  const [editMaxFreeBookings, setEditMaxFreeBookings] = useState("");
  const [editEligibleSuites, setEditEligibleSuites] = useState<string[]>([]);
  const [editDiscount, setEditDiscount] = useState("");
  const [editBenefits, setEditBenefits] = useState<string[]>([]);
  const [editTerms, setEditTerms] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const data = await membershipsApi.getPlans();
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch plans", err);
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchPurchases = async () => {
    try {
      setPurchasesLoading(true);
      const data = await membershipsApi.getPurchases();
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch purchases", err);
    } finally {
      setPurchasesLoading(false);
    }
  };

  // Fetch suites on mount
  useEffect(() => {
    suitesApi.getAll().then((data) => {
      setAllSuites(Array.isArray(data) ? data : []);
    }).catch(err => console.error("Failed to fetch suites", err));
  }, []);

  useEffect(() => {
    if (activeTab === "plans") {
      fetchPlans();
    } else {
      fetchPurchases();
    }
  }, [activeTab]);

  const handleCreateClick = () => {
    setModalMode("create");
    setEditName("Silver");
    setEditPrice("");
    setEditValidity("365");
    setEditValidityType("yearly");
    setEditMaxFreeBookings("10");
    setEditEligibleSuites([]);
    setEditBenefits([]);
    setEditTerms("");
    setEditStatus("active");
    setUpdateError("");
    setIsEditModalOpen(true);
  };

  const handleEditClick = (plan: MembershipPlanType) => {
    setModalMode("edit");
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditPrice(String(plan.price));
    setEditValidity(String(plan.validityDays));
    setEditDiscount(String(plan.discountPercent));
    setEditValidityType(plan.validityType || "yearly");
    setEditMaxFreeBookings(String(plan.maxFreeBookings ?? 10));
    setEditEligibleSuites(Array.isArray(plan.eligibleSuites) ? plan.eligibleSuites.map(String) : []);
    
    // Normalize benefits array
    let bList: string[] = [];
    if (plan.benefits) {
      if (Array.isArray(plan.benefits)) {
        bList = [...plan.benefits];
      } else if (typeof plan.benefits === "string") {
        bList = plan.benefits.split(",").map(b => b.trim());
      }
    }
    setEditBenefits(bList);
    setEditTerms(plan.terms || "");
    setEditStatus(plan.status);
    setUpdateError("");
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this celebration package? All active subscriptions to this package will remain active until expiry.")) return;
    try {
      await membershipsApi.removePlan(id);
      toast.success("Celebration package deleted successfully.");
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete package");
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const priceNum = parseFloat(editPrice);
    const validityNum = parseInt(editValidity);
    const maxBookingsNum = parseInt(editMaxFreeBookings);

    if (isNaN(priceNum) || priceNum < 0) {
      setUpdateError("Price must be a valid positive number.");
      return;
    }
    if (isNaN(validityNum) || validityNum <= 0) {
      setUpdateError("Validity duration must be a positive integer.");
      return;
    }
    if (isNaN(maxBookingsNum) || maxBookingsNum < 0) {
      setUpdateError("Max free bookings must be a valid positive integer.");
      return;
    }

    try {
      setUpdating(true);
      setUpdateError("");
      
      const payload = {
        name: editName,
        price: priceNum,
        validityType: editValidityType,
        validityDays: validityNum,
        maxFreeBookings: maxBookingsNum,
        eligibleSuites: editEligibleSuites,
        benefits: editBenefits.filter(b => b.trim() !== ""),
        terms: editTerms,
        status: editStatus,
      };

      if (modalMode === "create") {
        await membershipsApi.createPlan(payload);
        toast.success("Celebration package created successfully!");
      } else {
        if (!editingPlan) return;
        await membershipsApi.updatePlan(editingPlan.id, payload);
        toast.success("Celebration package updated successfully!");
      }
      setIsEditModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      setUpdateError(err.message || `Failed to ${modalMode === "create" ? "create" : "update"} package`);
      toast.error(err.message || `Failed to ${modalMode === "create" ? "create" : "update"} package`);
    } finally {
      setUpdating(false);
    }
  };

  const addBenefitInput = () => {
    setEditBenefits([...editBenefits, ""]);
  };

  const removeBenefitInput = (index: number) => {
    const next = [...editBenefits];
    next.splice(index, 1);
    setEditBenefits(next);
  };

  const updateBenefitValue = (index: number, val: string) => {
    const next = [...editBenefits];
    next[index] = val;
    setEditBenefits(next);
  };

  // Filtered purchases list
  const filteredPurchases = purchases.filter((p) => {
    const nameMatch = (p.user?.fullName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
                      (p.user?.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                      (p.paymentId?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const statusMatch = statusFilter === "all" || p.status === statusFilter;
    return nameMatch && statusMatch;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[oklch(0.08_0.015_260)] text-foreground">
      <AdminHeader title="Celebration Package Management" />

      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          {/* Navigation Tabs */}
          <div className="flex gap-1.5 p-1 glass-card border border-white/5 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab("plans")}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all duration-300 ${
                activeTab === "plans"
                  ? "bg-gold text-[oklch(0.12_0.02_260)] font-bold shadow-[0_4px_20px_rgba(212,160,60,0.25)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              CELEBRATION PACKAGES
            </button>
            <button
              onClick={() => setActiveTab("purchases")}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all duration-300 ${
                activeTab === "purchases"
                  ? "bg-gold text-[oklch(0.12_0.02_260)] font-bold shadow-[0_4px_20px_rgba(212,160,60,0.25)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              CUSTOMER PURCHASES
            </button>
          </div>

          {activeTab === "plans" && (
            <button
              onClick={handleCreateClick}
              className="gold-btn flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_20px_rgba(212,160,60,0.2)]"
            >
              <Plus className="h-4 w-4" /> Add Package
            </button>
          )}
        </div>

        {/* Tab 1: Membership Plans */}
        {activeTab === "plans" && (
          <div>
            {plansLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {plans.map((plan) => {
                  const isGold = plan.name?.toLowerCase().includes("gold") || !plan.name?.toLowerCase().includes("silver");
                  const benefitsArray = Array.isArray(plan.benefits) 
                    ? plan.benefits 
                    : typeof plan.benefits === "string" 
                      ? (plan.benefits as string).split(",") 
                      : [];

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-3xl border p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                        isGold
                          ? "border-gold/30 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent shadow-[0_20px_50px_rgba(212,160,60,0.05)]"
                          : "border-slate-500/30 bg-gradient-to-br from-slate-500/15 via-slate-500/5 to-transparent"
                      }`}
                    >
                      {/* Top Plan Meta */}
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest ${
                            plan.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {plan.status === "active" ? (
                              <>
                                <CheckCircle className="h-3 w-3" /> Active
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" /> Inactive
                              </>
                            )}
                          </span>
                          <h3 className="font-display text-2xl font-bold tracking-wide mt-2 text-foreground flex items-center gap-2">
                            <Award className={`h-6 w-6 ${isGold ? "text-gold animate-pulse" : "text-slate-400"}`} />
                            {plan.name} Package
                          </h3>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleEditClick(plan)}
                            className="p-2.5 rounded-xl border border-white/10 hover:border-gold/30 hover:bg-gold/15 text-muted-foreground hover:text-gold transition-all duration-300"
                            title="Edit Configuration"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(plan.id)}
                            className="p-2.5 rounded-xl border border-white/10 hover:border-rose-500/30 hover:bg-rose-500/15 text-muted-foreground hover:text-rose-400 transition-all duration-300"
                            title="Delete Package"
                          >
                            <XCircle className="h-4 w-4 text-rose-500" />
                          </button>
                        </div>
                      </div>

                      {/* Pricing & Free Bookings */}
                      <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-4 mb-6">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Package Price</p>
                          <p className="font-display text-2xl font-bold text-gold mt-1">₹{Number(plan.price).toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Free Bookings Limit</p>
                          <p className="font-display text-2xl font-bold text-emerald-400 mt-1">{plan.maxFreeBookings ?? 10} Allowed</p>
                        </div>
                      </div>

                      {/* Validity & Eligible Suites Info */}
                      <div className="space-y-4 mb-6 text-xs border-b border-white/5 pb-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Validity Period</p>
                          <p className="text-foreground capitalize font-semibold">{plan.validityType || "yearly"} ({plan.validityDays} days)</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Eligible Suites</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(plan.eligibleSuites || []).length === 0 ? (
                              <span className="text-muted-foreground italic">No suites selected</span>
                            ) : (
                              (plan.eligibleSuites || []).map((suiteId) => {
                                const suiteName = allSuites.find(s => String(s.id) === String(suiteId))?.name || `Suite #${suiteId}`;
                                return (
                                  <span key={suiteId} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground text-[10px] font-semibold">
                                    {suiteName}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Benefits */}
                      <div className="space-y-3 mb-6">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Package Benefits</p>
                        {benefitsArray.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No benefits configured.</p>
                        ) : (
                          <ul className="space-y-2">
                            {benefitsArray.map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/80 leading-relaxed">
                                <span className="text-gold mt-0.5 font-bold">✓</span>
                                {benefit.trim()}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Terms & Conditions */}
                      {plan.terms && (
                        <div className="border-t border-white/5 pt-4">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Terms & Conditions</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{plan.terms}</p>
                        </div>
                      )}

                      {/* Meta Footer */}
                      <div className="mt-4 flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>Validity: {plan.validityDays} days</span>
                        {plan.updatedAt && <span>Updated: {new Date(plan.updatedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Customer Purchases Tracker */}
        {activeTab === "purchases" && (
          <div className="space-y-4">
            {/* Filters Header */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between glass-card border border-white/5 p-4 rounded-2xl">
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search customer name, email, payment ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="luxury-input w-full pl-10 pr-4 py-2.5 text-xs"
                />
              </div>

              {/* Status filter tabs */}
              <div className="flex gap-1 bg-black/40 border border-white/5 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                {(["all", "active", "expired", "inactive"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 ${
                      statusFilter === status
                        ? "bg-gold/15 text-gold border border-gold/25"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Purchases Table */}
            {purchasesLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" />
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="text-center py-20 glass-card border border-white/5 rounded-3xl">
                <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto mb-2 animate-bounce" />
                <p className="text-sm text-muted-foreground font-display">No membership purchases match your filters.</p>
              </div>
            ) : (
              <div className="glass-card border border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                        <th className="py-4 px-6">Customer</th>
                        <th className="py-4 px-6">Package</th>
                        <th className="py-4 px-6">Payment Status & ID</th>
                        <th className="py-4 px-6 text-center">Bookings Used</th>
                        <th className="py-4 px-6 text-center">Remaining</th>
                        <th className="py-4 px-6">Eligible Suites</th>
                        <th className="py-4 px-6">Purchase Date</th>
                        <th className="py-4 px-6">Expiry Date</th>
                        <th className="py-4 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {filteredPurchases.map((purchase) => {
                        const isGold = purchase.planName?.toLowerCase().includes("gold") || !purchase.planName?.toLowerCase().includes("silver");
                        const suiteNames = (purchase.eligibleSuites || [])
                          .map(id => allSuites.find(s => String(s.id) === String(id))?.name || `Suite #${id}`)
                          .join(", ");

                        return (
                          <tr key={purchase.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                            {/* User details */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-gold border border-white/10 shrink-0">
                                  {purchase.user?.fullName.charAt(0) || "U"}
                                </div>
                                <div className="leading-normal">
                                  <p className="font-semibold text-foreground">{purchase.user?.fullName || "Deleted User"}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{purchase.user?.email || "N/A"}</p>
                                </div>
                              </div>
                            </td>

                            {/* Plan Name */}
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                                isGold 
                                  ? "bg-gold/15 text-gold border border-gold/25" 
                                  : "bg-slate-400/10 text-slate-400 border border-slate-500/20"
                              }`}>
                                <Award className="h-3 w-3" />
                                {purchase.planName}
                              </span>
                            </td>

                            {/* Payment details */}
                            <td className="py-4 px-6 leading-normal">
                              <p className="font-mono text-gold font-bold">₹{Number(purchase.amountPaid).toLocaleString("en-IN")}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{purchase.paymentId || "N/A"}</p>
                              <span className={`inline-flex items-center text-[9px] font-semibold uppercase mt-0.5 ${
                                purchase.paymentStatus === "success" ? "text-emerald-400" : "text-rose-400"
                              }`}>
                                {purchase.paymentStatus}
                              </span>
                            </td>

                            {/* Bookings Used */}
                            <td className="py-4 px-6 font-mono text-center text-foreground font-semibold">
                              {purchase.bookingsUsed ?? 0} / {purchase.maxFreeBookings ?? 10}
                            </td>

                            {/* Remaining */}
                            <td className="py-4 px-6 font-mono text-center text-emerald-400 font-semibold">
                              {Math.max(0, (purchase.maxFreeBookings ?? 10) - (purchase.bookingsUsed ?? 0))}
                            </td>

                            {/* Eligible Suites */}
                            <td className="py-4 px-6 text-muted-foreground max-w-xs truncate" title={suiteNames}>
                              {suiteNames || "None"}
                            </td>

                            {/* Dates */}
                            <td className="py-4 px-6 text-muted-foreground font-mono">
                              {new Date(purchase.activationDate).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-6 text-muted-foreground font-mono">
                              {new Date(purchase.expiryDate).toLocaleDateString()}
                            </td>

                            {/* Status */}
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                                purchase.status === "active"
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : purchase.status === "expired"
                                    ? "bg-amber-500/15 text-amber-400"
                                    : "bg-rose-500/15 text-rose-400"
                              }`}>
                                {purchase.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Plan Modal */}
      {isEditModalOpen && (modalMode === "create" || editingPlan) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl border border-gold/20 p-6 w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <h3 className="font-display text-xl text-foreground font-bold mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
              <Award className="h-5.5 w-5.5 text-gold shrink-0" />
              {modalMode === "create" ? "Create Celebration Package" : `Configure ${editName} Package`}
            </h3>

            {updateError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-2.5 rounded-xl mb-4">
                ✕ {updateError}
              </div>
            )}

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="space-y-1.5 mb-3">
                <label className="text-muted-foreground uppercase tracking-widest text-[9px] font-semibold text-gold">Package Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silver Package, Gold Package, Platinum Custom..."
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="luxury-input w-full px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground uppercase tracking-widest text-[9px] font-semibold">Package Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="luxury-input w-full px-3 py-2"
                  />
                </div>

                {/* Validity Period Type */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground uppercase tracking-widest text-[9px] font-semibold">Validity Period Type</label>
                  <select
                    value={editValidityType}
                    onChange={(e) => {
                      const type = e.target.value as "monthly" | "quarterly" | "half-yearly" | "yearly" | "custom";
                      setEditValidityType(type);
                      if (type === "monthly") setEditValidity("30");
                      if (type === "quarterly") setEditValidity("90");
                      if (type === "half-yearly") setEditValidity("180");
                      if (type === "yearly") setEditValidity("365");
                    }}
                    className="luxury-input w-full px-3 py-2 bg-[oklch(0.12_0.02_260)]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarter Year</option>
                    <option value="half-yearly">Half Year</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom Duration</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Validity days */}
                {editValidityType === "custom" && (
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground uppercase tracking-widest text-[9px] font-semibold">Validity Duration (Days)</label>
                    <input
                      type="number"
                      required
                      value={editValidity}
                      onChange={(e) => setEditValidity(e.target.value)}
                      className="luxury-input w-full px-3 py-2"
                    />
                  </div>
                )}

                {/* Max free bookings */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground uppercase tracking-widest text-[9px] font-semibold">Total Free Bookings Allowed</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editMaxFreeBookings}
                    onChange={(e) => setEditMaxFreeBookings(e.target.value)}
                    className="luxury-input w-full px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Active status */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground uppercase tracking-widest text-[9px] font-semibold">Active Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "active" | "inactive")}
                    className="luxury-input w-full px-3 py-2 bg-[oklch(0.12_0.02_260)]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Eligible Suites */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground uppercase tracking-widest text-[9px] font-semibold">Eligible Suites Selection</label>
                  <div className="border border-white/10 rounded-xl p-2 bg-black/40 max-h-28 overflow-y-auto space-y-1.5">
                    {allSuites.map((suite) => {
                      const isChecked = editEligibleSuites.includes(String(suite.id));
                      return (
                        <label key={suite.id} className="flex items-center gap-2 text-foreground font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditEligibleSuites([...editEligibleSuites, String(suite.id)]);
                              } else {
                                setEditEligibleSuites(editEligibleSuites.filter((id) => id !== String(suite.id)));
                              }
                            }}
                            className="rounded border-white/20 bg-transparent text-gold focus:ring-0 focus:ring-offset-0"
                          />
                          <span>{suite.name}</span>
                        </label>
                      );
                    })}
                    {allSuites.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic text-center py-1">No suites found</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-muted-foreground uppercase tracking-widest text-[9px] font-semibold">Benefits List</label>
                  <button
                    type="button"
                    onClick={addBenefitInput}
                    className="text-gold hover:text-foreground text-[10px] font-semibold flex items-center gap-1 transition"
                  >
                    <Plus className="h-3 w-3" /> Add Benefit
                  </button>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {editBenefits.map((benefit, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        placeholder="Enter benefit description..."
                        value={benefit}
                        onChange={(e) => updateBenefitValue(index, e.target.value)}
                        className="luxury-input flex-1 px-3 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeBenefitInput(index)}
                        className="p-1.5 rounded-lg border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {editBenefits.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic text-center py-2">No benefits listed. Click "Add Benefit" to create one.</p>
                  )}
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground uppercase tracking-widest text-[9px] font-semibold">Terms & Conditions</label>
                <textarea
                  rows={3}
                  value={editTerms}
                  onChange={(e) => setEditTerms(e.target.value)}
                  className="luxury-input w-full px-3 py-2 resize-none"
                  placeholder="Enter terms and conditions..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-white/5">
                <button
                  type="submit"
                  disabled={updating}
                  className="gold-btn flex-1 rounded-xl py-2.5 font-semibold text-center flex justify-center items-center gap-1.5 disabled:opacity-50"
                >
                  {updating ? "Saving Changes..." : "Save Configuration"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 rounded-xl py-2.5 border border-white/10 text-muted-foreground hover:text-foreground transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
