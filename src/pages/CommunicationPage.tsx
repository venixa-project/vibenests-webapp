import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  Send,
  CheckCircle,
  Eye,
  Clock,
  AlertCircle,
  Search,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Phone,
  Loader2,
  Calendar,
  Check,
  Users,
  UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { usersApi, notificationsApi } from "@/lib/api";

interface MessageLog {
  id: number;
  guestName: string;
  guestEmail: string;
  mobileNumber: string;
  eventName: string;
  suiteName: string;
  eventDate: string;
  eventTime: string;
  messageType: string;
  status: 'Read' | 'Delivered' | 'Sent' | 'Failed' | 'Pending';
  sentOn: string;
  content: string;
}

export const META_TEMPLATES = [
  {
    id: "vibenests_celebration_booking",
    name: "VibeNests Celebration Booking (Marketing)",
    metaTemplateName: "vibenests_celebration_booking",
    category: "Marketing",
    content: "Welcome to VibeNests, {{1}}! ✨\n\nMake your celebrations unforgettable in our private luxury suites for Birthdays, Anniversaries & Candlelight Dates. Choose your preferred suite and book now.\n\nThank you for choosing VibeNests !\nLuxury Private Celebration Suites",
    buttonLabel: "Book Now",
    buttonUrl: "https://celebrations.vibenests.in",
    status: "Meta Approved"
  },
  {
    id: "login_otp",
    name: "Login OTP Verification (Authentication)",
    metaTemplateName: "login_otp",
    category: "Authentication",
    content: "Your VibeNests verification code is {{1}}. Valid for 5 minutes. Do not share this code with anyone.",
    buttonLabel: null,
    buttonUrl: null,
    status: "Meta Approved"
  }
];

export default function CommunicationPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Modals / Inputs
  const [showSendModal, setShowSendModal] = useState(false);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [recipientName, setRecipientName] = useState("");
  const [sendPhone, setSendPhone] = useState("");
  const [sendTemplate, setSendTemplate] = useState("vibenests_celebration_booking");
  const [customMessage, setCustomMessage] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Active View message modal
  const [selectedMessage, setSelectedMessage] = useState<MessageLog | null>(null);

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const data = await usersApi.getAll();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to load users for WhatsApp notification", err);
    }
  }

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  function handleSelectRegisteredUser(u: any) {
    setSelectedUserId(String(u.id));
    const name = u.fullName || u.name || "Valued Guest";
    setRecipientName(name);
    let rawPhone = u.phone || "";
    if (rawPhone && !rawPhone.startsWith("91") && rawPhone.length === 10) {
      rawPhone = "91" + rawPhone;
    }
    setSendPhone(rawPhone);
    clearFieldError("customer");
    clearFieldError("phone");
    clearFieldError("name");
  }

  function handleSwitchCustomerMode(mode: "existing" | "new") {
    setCustomerMode(mode);
    setFieldErrors({});
    if (mode === "new") {
      setSelectedUserId("");
      setRecipientName("");
      setSendPhone("");
    }
  }

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationsApi.getWhatsAppLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Could not retrieve message logs");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(log: MessageLog) {
    try {
      await notificationsApi.sendWhatsApp({
        phone: log.mobileNumber,
        message: log.content,
        messageType: log.messageType,
      });
      fetchLogs();
    } catch (err) {
      console.error("Resend failed", err);
    }
  }

  async function handleSendSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (customerMode === "existing" && !selectedUserId) {
      errors.customer = "Please select an existing customer from the list.";
    }

    if (!recipientName.trim()) {
      errors.name = "Recipient name is required.";
    }

    const cleanPhone = sendPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      errors.phone = "Recipient mobile number is required.";
    } else if (cleanPhone.length < 10) {
      errors.phone = "Please enter a valid phone number (at least 10 digits).";
    }

    if (sendTemplate === "custom" && !customMessage.trim()) {
      errors.message = "Please enter the custom message content to send.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSending(true);
    setSendError(null);

    const activeTpl = META_TEMPLATES.find((t) => t.id === sendTemplate);
    let messageText = customMessage;
    if (activeTpl && sendTemplate !== "custom") {
      messageText = activeTpl.content.replace("{{1}}", recipientName || "Guest");
    }

    try {
      await notificationsApi.sendWhatsApp({
        phone: cleanPhone,
        message: messageText,
        messageType: activeTpl?.name || "Custom Message",
        templateName: sendTemplate,
        userName: recipientName || "Guest",
      });

      setSendSuccess(true);
      fetchLogs();
      setTimeout(() => {
        setShowSendModal(false);
        setSendSuccess(false);
        setSelectedUserId("");
        setRecipientName("");
        setSendPhone("");
        setCustomMessage("");
      }, 1500);
    } catch (err: any) {
      setSendError(err.message || "Failed to dispatch WhatsApp message.");
    } finally {
      setSending(false);
    }
  }

  const todayStr = new Date().toLocaleDateString("en-CA");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.mobileNumber.includes(searchQuery) ||
      (log.content && log.content.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === "All" || log.messageType === typeFilter;

    let matchesDate = true;
    if (fromDate || toDate) {
      const logDateStr = new Date(log.sentOn).toISOString().slice(0, 10);
      if (fromDate && logDateStr < fromDate) {
        matchesDate = false;
      }
      if (toDate && logDateStr > toDate) {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesType && matchesDate;
  });

  const uniqueTypes = Array.from(new Set(logs.map((l) => l.messageType))).filter(Boolean);

  const totalCount = logs.length;
  const deliveredLogs = logs.filter((l) => l.status === "Delivered" || l.status === "Read");
  const readLogs = logs.filter((l) => l.status === "Read");
  const pendingLogs = logs.filter((l) => l.status === "Pending" || l.status === "Sent");
  const failedLogs = logs.filter((l) => l.status === "Failed");

  const deliveredCount = deliveredLogs.length;
  const readCount = readLogs.length;
  const pendingCount = pendingLogs.length;
  const failedCount = failedLogs.length;

  const deliveryRate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;
  const readRate = deliveredCount > 0 ? Math.round((readCount / deliveredCount) * 100) : 0;
  const pendingRate = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;
  const failedRate = totalCount > 0 ? Math.round((failedCount / totalCount) * 100) : 0;

  const totalEntries = filteredLogs.length;
  const totalPages = Math.ceil(totalEntries / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + rowsPerPage);

  const downloadCSV = () => {
    const headers = ["ID", "Guest Name", "Guest Email", "Mobile Number", "Event Name", "Suite Name", "Message Type", "Status", "Sent On", "Content"];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.guestName,
      l.guestEmail,
      l.mobileNumber,
      l.eventName,
      l.suiteName,
      l.messageType,
      l.status,
      new Date(l.sentOn).toLocaleString(),
      l.content?.replace(/"/g, '""'),
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WhatsApp_Communication_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[oklch(0.12_0.02_260)] text-foreground flex flex-col">
      <AdminHeader title={t("app.admin.communicationCenter", "Guest Communication Center")} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("app.admin.communicationSub", "Track WhatsApp notifications & guest communication status")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSendModal(true)}
              className="gold-btn rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-gold/10 shrink-0 cursor-pointer hover:scale-[1.02] transition"
            >
              <Send className="h-3.5 w-3.5" />
              {t("app.admin.sendNotification", "Send WhatsApp Notification")}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                title: "Messages Sent",
                value: totalCount,
                subtitle: "Total messages sent",
                icon: Send,
                color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
              },
              {
                title: "Delivered",
                value: deliveredCount,
                subtitle: `${deliveryRate}% of total`,
                icon: CheckCircle,
                color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
              },
              {
                title: "Read",
                value: readCount,
                subtitle: `${readRate}% of delivered`,
                icon: Eye,
                color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
              },
              {
                title: "Pending",
                value: pendingCount,
                subtitle: `${pendingRate}% of total`,
                icon: Clock,
                color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
              },
              {
                title: "Failed",
                value: failedCount,
                subtitle: `${failedRate}% of total`,
                icon: AlertCircle,
                color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`glass-card rounded-2xl p-5 border flex flex-col justify-between ${item.color.split(" ").slice(2).join(" ")} bg-white/3`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.title}</span>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${item.color.split(" ").slice(0, 2).join(" ")} bg-white/5`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-display font-bold text-foreground">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">

              <div className="flex flex-wrap items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                <Calendar className="h-3.5 w-3.5 text-gold/80" />

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-gold tracking-wider">From:</span>
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || todayStr}
                    onChange={(e) => {
                      let newFrom = e.target.value;
                      if (newFrom && newFrom > todayStr) {
                        newFrom = todayStr;
                      }
                      setFromDate(newFrom);
                      if (toDate && newFrom > toDate) {
                        setToDate(newFrom);
                      }
                      setCurrentPage(1);
                    }}
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-foreground cursor-pointer outline-none focus:border-gold/50 transition"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-gold tracking-wider">To:</span>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    max={todayStr}
                    onChange={(e) => {
                      let newTo = e.target.value;
                      if (newTo && newTo > todayStr) {
                        newTo = todayStr;
                      }
                      if (fromDate && newTo < fromDate) {
                        setToDate(fromDate);
                      } else {
                        setToDate(newTo);
                      }
                      setCurrentPage(1);
                    }}
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-foreground cursor-pointer outline-none focus:border-gold/50 transition"
                  />
                </div>

                {(fromDate || toDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                      setCurrentPage(1);
                    }}
                    className="text-[10px] text-muted-foreground hover:text-white underline cursor-pointer ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                <Filter className="h-3.5 w-3.5 text-gold/80" />
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-foreground cursor-pointer outline-none font-medium"
                >
                  <option value="All" className="bg-[oklch(0.12_0.02_260)] text-foreground">All Events / Templates</option>
                  {uniqueTypes.map((t) => (
                    <option key={t} value={t} className="bg-[oklch(0.12_0.02_260)] text-foreground">{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto md:flex-1 justify-end">
              <div className="relative flex-1 md:max-w-xs w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by guest name or mobile"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="luxury-input w-full pl-9 pr-4 py-2 rounded-xl text-xs"
                />
              </div>

              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 text-xs font-semibold gold-btn px-4 py-2 rounded-xl shadow-md shadow-gold/15 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">

            <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">Communication Details</h3>
                  {(fromDate || toDate) && (
                    <p className="text-[11px] text-gold mt-0.5">
                      Filtered: {fromDate || "Start"} to {toDate || "Present"} ({totalEntries} results)
                    </p>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="p-16 text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gold" />
                  <p className="text-sm text-muted-foreground">Retrieving WhatsApp logs...</p>
                </div>
              ) : paginatedLogs.length === 0 ? (
                <div className="p-16 text-center text-sm text-muted-foreground">
                  No logs found matching selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5 text-muted-foreground font-semibold uppercase tracking-wider">
                        <th className="px-5 py-4">Guest Name</th>
                        <th className="px-5 py-4">Mobile Number</th>
                        <th className="px-5 py-4">Message Type</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Sent On</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedLogs.map((log) => {
                        const initials = log.guestName.split(" ").map(w => w.charAt(0)).join("").slice(0, 2).toUpperCase();
                        const colors = ["bg-indigo-500/10 text-indigo-400 border-indigo-500/20", "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", "bg-sky-500/10 text-sky-400 border-sky-500/20", "bg-rose-500/10 text-rose-400 border-rose-500/20", "bg-amber-500/10 text-amber-400 border-amber-500/20"];
                        const colorIndex = log.guestName.charCodeAt(0) % colors.length;

                        return (
                          <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${colors[colorIndex]}`}>
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-foreground truncate">{log.guestName}</h4>
                                  <p className="text-[10px] text-muted-foreground truncate">{log.guestEmail}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                                {log.mobileNumber}
                                <a
                                  href={`https://wa.me/${log.mobileNumber.replace(/\+/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded hover:bg-emerald-500/15 text-emerald-400 transition"
                                  title="Open chat on WhatsApp Web"
                                >
                                  <Phone className="h-3 w-3" />
                                </a>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {(() => {
                                const type = log.messageType || "";
                                let badgeColor = "bg-white/5 border-white/10 text-muted-foreground";
                                if (type.includes("OTP")) {
                                  badgeColor = "bg-amber-500/15 border-amber-500/30 text-amber-300";
                                } else if (type.includes("Booking")) {
                                  badgeColor = "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
                                } else if (type.includes("Payment")) {
                                  badgeColor = "bg-sky-500/15 border-sky-500/30 text-sky-400";
                                } else if (type.includes("Account")) {
                                  badgeColor = "bg-purple-500/15 border-purple-500/30 text-purple-400";
                                } else if (type.includes("Marketing") || type.includes("Celebration")) {
                                  badgeColor = "bg-indigo-500/15 border-indigo-500/30 text-indigo-400";
                                } else if (type.includes("Refund")) {
                                  badgeColor = "bg-rose-500/15 border-rose-500/30 text-rose-400";
                                }
                                return (
                                  <span className={`border rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ${badgeColor}`}>
                                    {type || "General Notification"}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-5 py-4">
                              {log.status === "Read" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max">
                                  <Check className="h-3 w-3" /> Read
                                </span>
                              ) : log.status === "Delivered" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/20 flex items-center gap-1 w-max">
                                  <Check className="h-3 w-3" /> Delivered
                                </span>
                              ) : log.status === "Failed" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/20 flex items-center gap-1 w-max">
                                  <AlertCircle className="h-3 w-3" /> Failed
                                </span>
                              ) : log.status === "Pending" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-max">
                                  <Clock className="h-3 w-3" /> Pending
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-muted-foreground border border-white/10 flex items-center gap-1 w-max">
                                  <Send className="h-3 w-3" /> Sent
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                              {new Date(log.sentOn).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleResend(log)}
                                  className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-gold transition"
                                  title="Resend Notification"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setSelectedMessage(log)}
                                  className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-gold transition"
                                  title="View Message Body"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, totalEntries)} of {totalEntries} entries
                </span>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span>Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white/5 border border-white/10 rounded-lg p-1 text-foreground cursor-pointer"
                    >
                      <option value={5} className="bg-[oklch(0.12_0.02_260)]">5</option>
                      <option value={10} className="bg-[oklch(0.12_0.02_260)]">10</option>
                      <option value={25} className="bg-[oklch(0.12_0.02_260)]">25</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-7 w-7 rounded-lg border border-white/5 flex items-center justify-center hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-2 font-mono">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="h-7 w-7 rounded-lg border border-white/5 flex items-center justify-center hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-4">
                <h3 className="font-display text-sm font-semibold text-foreground">Communication Health</h3>

                <div className="flex justify-center relative py-4">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      stroke="var(--gold)"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={326.7}
                      strokeDashoffset={326.7 - (326.7 * deliveryRate) / 100}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-foreground">{deliveryRate}%</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">Delivery Rate</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/5 pt-4">
                  {[
                    { label: "Delivered", rate: deliveryRate, dot: "bg-emerald-400" },
                    { label: "Read", rate: readRate, dot: "bg-sky-400" },
                    { label: "Pending", rate: pendingRate, dot: "bg-amber-400" },
                    { label: "Failed", rate: failedRate, dot: "bg-rose-400" },
                  ].map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${h.dot}`} />
                        {h.label}
                      </span>
                      <span className="font-semibold text-foreground font-mono">{h.rate}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <AnimatePresence>
        {showSendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4 py-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card rounded-2xl p-6 w-full max-w-lg border border-[var(--gold)]/30 shadow-2xl shadow-black/80 relative"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">
                    Send WhatsApp Notification
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Push official templates directly to guests via WhatsApp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {sendSuccess ? (
                <div className="p-8 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                    <Check className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">Message Dispatched Successfully!</h4>
                  <p className="text-xs text-muted-foreground">The notification logs have been updated in real-time.</p>
                </div>
              ) : (
                <form onSubmit={handleSendSubmit} className="space-y-4">

                  <div className="p-1 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSwitchCustomerMode("existing")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${customerMode === "existing"
                        ? "bg-[var(--gold)] text-black shadow-md font-bold"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                        }`}
                    >
                      <Users className="h-4 w-4" /> Existing User
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwitchCustomerMode("new")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${customerMode === "new"
                        ? "bg-[var(--gold)] text-black shadow-md font-bold"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                        }`}
                    >
                      <UserPlus className="h-4 w-4" /> New User
                    </button>
                  </div>

                  {customerMode === "existing" && (
                    <div className="space-y-2 p-3.5 rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> Select Customer <span className="text-rose-400">*</span>
                        </label>
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowUserDropdown((prev) => !prev)}
                          className={`luxury-input w-full rounded-lg px-3 py-2.5 text-xs flex items-center justify-between text-left cursor-pointer hover:border-[var(--gold)]/50 transition ${fieldErrors.customer ? "border-rose-500 bg-rose-500/10" : ""
                            }`}
                        >
                          <span className={selectedUserId ? "text-foreground font-semibold" : "text-muted-foreground"}>
                            {selectedUserId
                              ? `${recipientName} (${sendPhone || "No Phone"})`
                              : `-- Select Registered Customer --`}
                          </span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${showUserDropdown ? "rotate-180 text-gold" : ""
                              }`}
                          />
                        </button>

                        {fieldErrors.customer && (
                          <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                            <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.customer}
                          </p>
                        )}

                        {showUserDropdown && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowUserDropdown(false)}
                            />
                            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-white/15 bg-[oklch(0.12_0.03_260)] backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                              <div className="max-h-48 overflow-y-auto divide-y divide-white/5 py-1">
                                {users.map((u) => {
                                  const isSelected = String(selectedUserId) === String(u.id);
                                  const uName = u.fullName || u.name || `User #${u.id}`;
                                  return (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onClick={() => {
                                        handleSelectRegisteredUser(u);
                                        setShowUserDropdown(false);
                                      }}
                                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition cursor-pointer ${isSelected
                                        ? "bg-[var(--gold)]/15 text-gold font-semibold"
                                        : "text-foreground hover:bg-white/5 hover:text-gold"
                                        }`}
                                    >
                                      <div>
                                        <span className="font-semibold text-foreground">{uName}</span>
                                        <span className="text-[10px] text-muted-foreground ml-2">({u.phone || u.email || "No phone"})</span>
                                      </div>
                                      {isSelected && <Check className="h-3.5 w-3.5 text-gold shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {customerMode === "new" && (
                    <div className="space-y-3 p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
                      <div>
                        <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                          Recipient Full Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Rahul Sharma"
                          value={recipientName}
                          onChange={(e) => {
                            setRecipientName(e.target.value);
                            clearFieldError("name");
                          }}
                          className={`luxury-input w-full px-3 py-2.5 rounded-xl text-sm mt-1 ${fieldErrors.name ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""
                            }`}
                        />
                        {fieldErrors.name && (
                          <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                            <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                          Recipient Mobile Number <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="tel"
                          placeholder="e.g. 919876543210"
                          value={sendPhone}
                          onChange={(e) => {
                            setSendPhone(e.target.value.replace(/[^\d+]/g, ""));
                            clearFieldError("phone");
                          }}
                          className={`luxury-input w-full px-3 py-2.5 rounded-xl text-sm mt-1 ${fieldErrors.phone ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""
                            }`}
                        />
                        {fieldErrors.phone && (
                          <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                            <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                      Notification Template <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={sendTemplate}
                      onChange={(e) => {
                        setSendTemplate(e.target.value);
                        setCustomMessage("");
                      }}
                      className="luxury-input w-full px-3 py-2.5 rounded-xl text-sm bg-[oklch(0.12_0.02_260)] cursor-pointer"
                    >
                      {META_TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id} className="bg-[oklch(0.12_0.02_260)]">
                          {t.name}
                        </option>
                      ))}
                      <option value="custom" className="bg-[oklch(0.12_0.02_260)]">
                        -- Custom Direct Message --
                      </option>
                    </select>
                  </div>

                  {sendTemplate === "custom" && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                        Custom Message Content <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Type your custom notification body..."
                        value={customMessage}
                        onChange={(e) => {
                          setCustomMessage(e.target.value);
                          clearFieldError("message");
                        }}
                        className={`luxury-input w-full px-3 py-2 rounded-xl text-sm bg-[oklch(0.12_0.02_260)] resize-none ${fieldErrors.message ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""
                          }`}
                      />
                      {fieldErrors.message && (
                        <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                          <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.message}
                        </p>
                      )}
                    </div>
                  )}

                  {sendError && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 rounded-lg text-center font-medium flex items-center justify-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {sendError}
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSendModal(false)}
                      className="flex-1 glass rounded-xl py-2.5 text-xs text-muted-foreground border border-white/10 hover:text-foreground transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sending}
                      className="flex-1 gold-btn rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-gold/15"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Dispatching...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" /> Send Template
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card rounded-2xl p-6 w-full max-w-md border border-[var(--gold)]/20 shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-display text-base font-semibold text-foreground">
                  Message Details
                </h3>
                <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-muted-foreground font-mono">
                  ID: #{selectedMessage.id}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground/60 mb-0.5">Guest Name</span>
                    <span className="text-foreground font-medium">{selectedMessage.guestName}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground/60 mb-0.5">Mobile Number</span>
                    <span className="text-foreground font-medium">{selectedMessage.mobileNumber}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground/60 mb-0.5">Template Type</span>
                    <span className="text-foreground font-medium">{selectedMessage.messageType}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground/60 mb-0.5">Sent On</span>
                    <span className="text-foreground font-medium">{new Date(selectedMessage.sentOn).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground/60">Message Content</span>
                  <div className="bg-black/20 border border-white/5 rounded-xl p-3 font-mono leading-relaxed text-foreground select-all whitespace-pre-wrap">
                    {selectedMessage.content}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleResend(selectedMessage)}
                  className="flex-1 gold-btn rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Resend Message
                </button>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex-1 glass rounded-xl py-2 text-xs text-muted-foreground border border-white/10 hover:text-foreground transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
