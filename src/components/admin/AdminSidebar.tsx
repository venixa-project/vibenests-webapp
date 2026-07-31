import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { authApi } from "@/lib/api";
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  Tag,
  Package,
  Users,
  Gift,
  CreditCard,
  Star,
  RotateCcw,
  Share2,
  ChevronDown,
  Briefcase,
  Sliders,
  Grid,
  MessageSquare,
} from "lucide-react";
import { LogoPopover } from "@/components/shared/LogoPopover";
import { useTranslation } from "react-i18next";
import { useSidebar } from "@/components/admin/SidebarContext";

const navItemKeys: { [key: string]: string } = {
  "Refunds": "refunds",
  "Refund Configurations": "refunds",
  "Transactions": "transactions",
  "Dashboard": "dashboard",
  "Bookings": "bookings",
  "Suite Booking": "suiteBooking",
  "Suites": "suites",
  "Add-on Management": "addonManagement",
  "Celebration Packages": "celebrationMembership",
  "Celebration Membership": "celebrationMembership",
  "User Management": "userManagement",
  "Referral Management": "referralManagement",
  "Analytics": "analytics",
  "Offers & Coupon Configurations": "offersRefund",
  "Ratings & Reviews": "ratingsReviews",
  "Settings": "settings",
  "Communication Center": "communicationCenter",
};

const navSections = [
  {
    title: "Overview",
    icon: Grid,
    items: [
      { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
      { icon: BarChart2, label: "Analytics", to: "/analytics" },
    ],
  },
  {
    title: "Business Operations",
    icon: Briefcase,
    items: [
      { icon: CalendarDays, label: "Bookings", to: "/bookings" },
      { icon: CreditCard, label: "Transactions", to: "/transactions" },
      { icon: Users, label: "User Management", to: "/customers" },
      { icon: Share2, label: "Referral Management", to: "/referrals" },
      { icon: Star, label: "Ratings & Reviews", to: "/reviews" },
      { icon: MessageSquare, label: "Communication Center", to: "/communication" },
    ],
  },
  {
    title: "Business Configurations",
    icon: Sliders,
    items: [
      { icon: BedDouble, label: "Suites", to: "/rooms" },
      { icon: Package, label: "Add-on Management", to: "/addons" },
      { icon: Gift, label: "Celebration Membership", to: "/celebration-memberships" },
      { icon: Tag, label: "Offers & Coupon Configurations", to: "/offers" },
      { icon: RotateCcw, label: "Refund Configurations", to: "/refunds" },
    ],
  },
  {
    title: "System Configurations",
    icon: Settings,
    items: [
      { icon: Settings, label: "Settings", to: "/settings" },
    ],
  },
];

export function AdminSidebar() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { clearSession } = useAuth();
  const { t } = useTranslation();

  // Initialize each sub-nav's open state.
  // A sub-nav will be open by default if it contains the currently active page.
  const [openSubnavs, setOpenSubnavs] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navSections.forEach((section) => {
      const hasActiveChild = section.items.some((item) => location.pathname === item.to);
      initial[section.title] = hasActiveChild;
    });
    // If no section has active child (e.g. on dashboard page), keep Overview open by default.
    if (!Object.values(initial).some(Boolean)) {
      initial["Overview"] = true;
    }
    return initial;
  });

  // Keep subnav open state in sync when the route changes externally
  useEffect(() => {
    let matched = false;
    navSections.forEach((section) => {
      const hasActiveChild = section.items.some((item) => location.pathname === item.to);
      if (hasActiveChild) {
        setOpenSubnavs({ [section.title]: true });
        matched = true;
      }
    });
    if (!matched && location.pathname === '/dashboard') {
      setOpenSubnavs({ "Overview": true });
    }
  }, [location.pathname]);

  const toggleSubnav = (title: string) => {
    setOpenSubnavs((prev) => {
      const isCurrentlyOpen = !!prev[title];
      const updated: Record<string, boolean> = {};
      navSections.forEach((s) => {
        updated[s.title] = false;
      });
      if (!isCurrentlyOpen) {
        updated[title] = true;
      }
      return updated;
    });
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`flex flex-col h-full shrink-0 fixed lg:sticky top-0 bg-[oklch(0.11_0.025_260)] border-r border-[var(--gold)]/10 transition-all duration-300 z-50
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "lg:w-16" : "lg:w-64"} w-64`}
      >
        {/* Brand + Toggle */}
        <div className="flex items-center justify-between px-3 h-[88px] border-b border-[var(--gold)]/10 shrink-0">
          {(!collapsed || mobileOpen) && (
            <div className="flex items-center gap-2">
              <img src="/image.png" alt="VibeNests" className="h-[72px] w-[72px] object-contain shrink-0" />
              <div className="leading-tight">
                <div className="font-display text-xl font-semibold tracking-wide text-gradient-gold">VIBENESTS</div>
                <div className="text-[10px] tracking-widest text-muted-foreground uppercase">{t("app.admin.adminPanel", "Admin Panel")}</div>
              </div>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.innerWidth < 1024) {
                setMobileOpen(false);
              } else {
                setCollapsed((c) => !c);
              }
            }}
            className={`h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/[0.07] text-muted-foreground hover:text-gold transition shrink-0 cursor-pointer ${collapsed && !mobileOpen ? "mx-auto" : ""}`}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto custom-scrollbar">
          {navSections.map((section, idx) => {
            const isCollapsedStyle = collapsed && !mobileOpen;
            const SectionIcon = section.icon;
            const hasActiveChild = section.items.some((item) => location.pathname === item.to);
            const isOpen = !!openSubnavs[section.title];

            if (isCollapsedStyle) {
              return (
                <div key={section.title} className="relative group flex justify-center py-1">
                  <button
                    className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${hasActiveChild
                      ? "bg-[var(--gold)]/10 text-gold border border-[var(--gold)]/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                      }`}
                  >
                    <SectionIcon className="h-5 w-5 shrink-0" />
                  </button>

                  {/* Popover Hover Submenu */}
                  <div
                    className="absolute left-full top-0 ml-2 pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 w-56 bg-[oklch(0.11_0.025_260)] border border-[var(--gold)]/20 rounded-xl p-2 shadow-2xl z-50"
                  >
                    <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gold border-b border-[var(--gold)]/10 mb-1.5">
                      {t("app.admin.section." + section.title.toLowerCase().replace(/\s+/g, ""), section.title)}
                    </div>
                    <div className="space-y-1">
                      {section.items.map(({ icon: Icon, label, to }) => {
                        const transKey = navItemKeys[label];
                        const translatedLabel = transKey ? t("app.admin." + transKey, label) : label;
                        return (
                          <NavLink
                            key={to}
                            to={to}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${isActive
                                ? "bg-[var(--gold)]/10 text-gold border border-[var(--gold)]/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                              }`
                            }
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{translatedLabel}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={section.title} className="space-y-1">
                {/* Collapsible Header */}
                <button
                  onClick={() => toggleSubnav(section.title)}
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-gold hover:bg-white/[0.03] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <SectionIcon className={`h-4 w-4 shrink-0 transition-colors ${hasActiveChild ? "text-gold" : "text-muted-foreground/80 group-hover:text-gold"
                      }`} />
                    <span className={hasActiveChild ? "text-foreground font-medium" : ""}>
                      {t("app.admin.section." + section.title.toLowerCase().replace(/\s+/g, ""), section.title)}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-gold" : "text-muted-foreground/60"
                      }`}
                  />
                </button>

                {/* Sub-items list */}
                <div
                  className={`pl-4 border-l border-[var(--gold)]/10 ml-5 space-y-1 overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[500px] opacity-100 py-1" : "max-h-0 opacity-0 py-0 pointer-events-none"
                    }`}
                >
                  {section.items.map(({ icon: Icon, label, to }) => {
                    const transKey = navItemKeys[label];
                    const translatedLabel = transKey ? t("app.admin." + transKey, label) : label;
                    return (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${isActive
                            ? "bg-[var(--gold)]/10 text-gold border border-[var(--gold)]/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                          }`
                        }
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{translatedLabel}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-[var(--gold)]/10">
          <button
            onClick={() => setShowConfirm(true)}
            title={collapsed && !mobileOpen ? t("app.admin.logout", "Logout") : undefined}
            className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full ${collapsed && !mobileOpen ? "justify-center" : ""
              }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {(!collapsed || mobileOpen) && <span>{t("app.admin.logout", "Logout")}</span>}
          </button>
        </div>
      </aside>

      {/* Confirm Dialog — rendered via portal to escape aside stacking context */}
      {showConfirm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm mx-4 border border-[var(--gold)]/20">
            <h3 className="font-display text-xl text-foreground mb-2">{t("app.admin.confirmLogout", "Confirm Logout")}</h3>
            <p className="text-sm text-muted-foreground mb-6">{t("app.admin.confirmLogoutText", "Are you sure you want to logout?")}</p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const rt = localStorage.getItem('refreshToken');
                  if (rt) await authApi.logout(rt).catch(() => { });
                  clearSession();
                  setShowConfirm(false);
                  navigate("/login");
                }}
                className="gold-btn flex-1 rounded-lg py-2.5 text-sm font-semibold"
              >
                {t("app.admin.yesLogout", "Yes, Logout")}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition"
              >
                {t("app.admin.cancel", "Cancel")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}


