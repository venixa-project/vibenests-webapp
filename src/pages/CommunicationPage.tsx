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
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileText,
  History,
  MessageSquare,
  Phone,
  User,
  Plus,
  Loader2,
  Calendar,
  Check,
  Building,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

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

const TEMPLATES = [
  {
    id: "booking_confirmed",
    name: "Booking Confirmation",
    content: "Hi {{name}}! Your booking is confirmed. Booking ID: #VN{{bookingId}}. We’re excited to host you at VibeNests.",
    category: "Operations"
  },
  {
    id: "payment_success",
    name: "Payment Received",
    content: "Hi {{name}}! Payment successful. Your booking is confirmed. Amount: {{amount}}. See you soon at VibeNests!",
    category: "Transactions"
  },
  {
    id: "otp_verification",
    name: "OTP Verification",
    content: "Your VibeNests OTP is {{otp}}. Valid for 5 minutes. Do not share this with anyone.",
    category: "System"
  },
  {
    id: "refund_status",
    name: "Refund Initiated",
    content: "Hi {{name}}! Your refund request of {{amount}} for booking #VN{{bookingId}} has been initiated. We'll update you once completed.",
    category: "Refunds"
  },
  {
    id: "offer_promotion",
    name: "Offer Promotion",
    content: "New offer is live at VibeNests: {{offerName}}. Check out the latest deals today!",
    category: "Marketing"
  }
];

export default function CommunicationPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"center" | "templates" | "history">("center");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Modals / Inputs
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendPhone, setSendPhone] = useState("");
  const [sendTemplate, setSendTemplate] = useState("booking_confirmed");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Active View message modal
  const [selectedMessage, setSelectedMessage] = useState<MessageLog | null>(null);

  const selectedTemplateObj = TEMPLATES.find((t) => t.id === sendTemplate);
  const previewText = (selectedTemplateObj?.content || "")
    .replace("{{name}}", "Rahul Sharma")
    .replace("{{bookingId}}", "VN1024")
    .replace("{{amount}}", "₹12,500")
    .replace("{{otp}}", "482015")
    .replace("{{offerName}}", "Monsoon Escape");

  const BASE_URL = "http://localhost:4000";

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BASE_URL}/notifications/whatsapp/logs`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to load logs");
      const data = await response.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || "Could not retrieve message logs");
    } finally {
      setLoading(false);
    }
  }

  // Resend action
  async function handleResend(log: MessageLog) {
    try {
      const response = await fetch(`${BASE_URL}/notifications/send/whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          phone: log.mobileNumber,
          message: log.content,
          messageType: log.messageType,
        }),
      });
      if (response.ok) {
        // Refresh logs list
        fetchLogs();
      }
    } catch (err) {
      console.error("Resend failed", err);
    }
  }

  // Send WhatsApp Notification submit
  async function handleSendSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sendPhone) {
      setSendError("Recipient phone number is required");
      return;
    }

    // Resolve template preview text
    let messageText = customMessage;
    const activeTpl = TEMPLATES.find(t => t.id === sendTemplate);
    if (activeTpl && !customMessage) {
      messageText = activeTpl.content
        .replace("{{name}}", "Valued Guest")
        .replace("{{bookingId}}", "1024")
        .replace("{{amount}}", "₹12,500")
        .replace("{{otp}}", "482015")
        .replace("{{offerName}}", "Monsoon Escape (15% OFF)");
    }

    setSending(true);
    setSendError(null);
    try {
      const response = await fetch(`${BASE_URL}/notifications/send/whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          phone: sendPhone,
          message: messageText,
          messageType: activeTpl?.name || "Custom",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send WhatsApp message");
      }

      setSendSuccess(true);
      setSendPhone("");
      setCustomMessage("");
      // Refresh list
      fetchLogs();
      setTimeout(() => {
        setShowSendModal(false);
        setSendSuccess(false);
      }, 1500);
    } catch (err: any) {
      setSendError(err.message || "Error sending message");
    } finally {
      setSending(false);
    }
  }

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Search filter
    const matchesSearch =
      log.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.mobileNumber.includes(searchQuery) ||
      (log.content && log.content.toLowerCase().includes(searchQuery.toLowerCase()));

    // Type filter
    const matchesType = typeFilter === "All" || log.messageType === typeFilter;

    // Date range filter helper
    const matchesDate = true; // Simplified for UI demonstration

    return matchesSearch && matchesType && matchesDate;
  });

  // Unique lists for dropdowns
  const uniqueTypes = Array.from(new Set(logs.map((l) => l.messageType))).filter(Boolean);

  // Metrics
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

  // Pagination logic
  const totalEntries = filteredLogs.length;
  const totalPages = Math.ceil(totalEntries / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + rowsPerPage);

  // Download CSV helper
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
        
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {t("app.admin.communicationTitle", "Guest Communication Center")}
              <span title="Track guest message logs and outbound notifications">
                <HelpCircle className="h-4.5 w-4.5 text-muted-foreground/60 cursor-help" />
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("app.admin.communicationSub", "Track WhatsApp notifications & guest communication status")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Header Tabs */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setActiveTab("center")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "center" ? "bg-[var(--gold)]/10 text-gold border border-[var(--gold)]/20" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 inline mr-1" />
                Center
              </button>
              <button
                onClick={() => setActiveTab("templates")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "templates" ? "bg-[var(--gold)]/10 text-gold border border-[var(--gold)]/20" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-3.5 w-3.5 inline mr-1" />
                Templates
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "history" ? "bg-[var(--gold)]/10 text-gold border border-[var(--gold)]/20" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-3.5 w-3.5 inline mr-1" />
                Logs
              </button>
            </div>

            {/* Send Notification Dropdown Button */}
            <button
              onClick={() => setShowSendModal(true)}
              className="gold-btn rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-gold/5 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              {t("app.admin.sendNotification", "Send Notification")}
              <ChevronDown className="h-3.5 w-3.5 border-l border-black/20 pl-0.5 ml-1" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "center" && (
            <motion.div
              key="center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Metrics Grid */}
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

              {/* Filters Block */}
              <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Date Filter */}
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-gold/80" />
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="bg-transparent text-foreground cursor-pointer outline-none font-medium"
                    >
                      <option value="All" className="bg-[oklch(0.12_0.02_260)] text-foreground">01 Jun 2026 - 28 Jun 2026</option>
                      <option value="Today" className="bg-[oklch(0.12_0.02_260)] text-foreground">Today</option>
                      <option value="Yesterday" className="bg-[oklch(0.12_0.02_260)] text-foreground">Yesterday</option>
                    </select>
                  </div>

                  {/* Event Filter */}
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                    <Filter className="h-3.5 w-3.5 text-gold/80" />
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="bg-transparent text-foreground cursor-pointer outline-none font-medium"
                    >
                      <option value="All" className="bg-[oklch(0.12_0.02_260)] text-foreground">All Events</option>
                      {uniqueTypes.map((t) => (
                        <option key={t} value={t} className="bg-[oklch(0.12_0.02_260)] text-foreground">{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Search & Export */}
                <div className="flex items-center gap-3 w-full md:w-auto md:flex-1 justify-end">
                  <div className="relative flex-1 md:max-w-xs w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by guest name or mobile"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
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

              {/* Two-Column Layout details */}
              <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
                
                {/* Main Table Card */}
                <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5">
                    <h3 className="font-display text-base font-semibold text-foreground">Communication Details</h3>
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
                                  <span className="bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {log.messageType}
                                  </span>
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

                  {/* Pagination Footer */}
                  <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, totalEntries)} of {totalEntries} entries
                    </span>

                    <div className="flex items-center gap-4">
                      {/* Rows selector */}
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

                      {/* Page selector buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className="h-7 w-7 rounded-lg border border-white/5 flex items-center justify-center hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="px-2 font-mono">{currentPage} / {totalPages}</span>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className="h-7 w-7 rounded-lg border border-white/5 flex items-center justify-center hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panels */}
                <div className="space-y-6">
                  
                  {/* Delivery Health Pie chart */}
                  <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-4">
                    <h3 className="font-display text-sm font-semibold text-foreground">Communication Health</h3>
                    
                    {/* Ring Chart */}
                    <div className="flex justify-center relative py-4">
                      <svg className="w-32 h-32 transform -rotate-90">
                        {/* Underlay circle */}
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth="10"
                          fill="transparent"
                        />
                        {/* Progress circle */}
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
                      {/* Centered label */}
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

                  {/* Quick Actions Panel */}
                  <div className="glass-card rounded-2xl border border-white/5 p-5 space-y-3">
                    <h3 className="font-display text-sm font-semibold text-foreground mb-1">Quick Actions</h3>
                    
                    <button
                      onClick={() => {
                        const failed = logs.filter(l => l.status === "Failed");
                        failed.forEach(handleResend);
                      }}
                      className="w-full text-left py-2.5 px-3 rounded-xl border border-white/5 bg-white/3 hover:bg-white/5 text-xs text-foreground flex items-center gap-2 transition"
                    >
                      <RotateCcw className="h-4 w-4 text-gold shrink-0" />
                      Resend Failed Messages
                    </button>

                    <button
                      onClick={() => {
                        setShowSendModal(true);
                        setSendTemplate("booking_confirmed");
                      }}
                      className="w-full text-left py-2.5 px-3 rounded-xl border border-white/5 bg-white/3 hover:bg-white/5 text-xs text-foreground flex items-center gap-2 transition"
                    >
                      <Send className="h-4 w-4 text-gold shrink-0" />
                      Send Event Reminder
                    </button>

                    <button
                      onClick={() => {
                        setShowSendModal(true);
                        setSendTemplate("payment_success");
                      }}
                      className="w-full text-left py-2.5 px-3 rounded-xl border border-white/5 bg-white/3 hover:bg-white/5 text-xs text-foreground flex items-center gap-2 transition"
                    >
                      <ExternalLink className="h-4 w-4 text-gold shrink-0" />
                      Share Meeting Link
                    </button>

                    <button
                      onClick={downloadCSV}
                      className="w-full text-left py-2.5 px-3 rounded-xl border border-white/5 bg-white/3 hover:bg-white/5 text-xs text-foreground flex items-center gap-2 transition font-semibold"
                    >
                      <Download className="h-4 w-4 text-gold shrink-0" />
                      Download Report
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "templates" && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-6 md:grid-cols-2"
            >
              {TEMPLATES.map((tpl) => (
                <div key={tpl.id} className="glass-card rounded-2xl border border-white/5 p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="bg-gold/10 border border-gold/20 text-gold text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full">
                        {tpl.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">ID: {tpl.id}</span>
                    </div>
                    <h3 className="font-display text-base font-semibold text-foreground">{tpl.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed bg-black/20 border border-white/5 rounded-xl p-3 font-mono italic">
                      "{tpl.content}"
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <p className="text-[10px] text-muted-foreground">Supported channels: WhatsApp API</p>
                    <button
                      onClick={() => {
                        setSendTemplate(tpl.id);
                        setShowSendModal(true);
                      }}
                      className="text-xs text-gold hover:underline flex items-center gap-1 font-semibold"
                    >
                      Use Template <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {logs.slice(0, 15).map((log) => (
                <div key={log.id} className="glass-card rounded-2xl border border-white/5 p-4 flex justify-between items-center gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                      <MessageSquare className="h-4 w-4 text-gold" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{log.guestName} ({log.mobileNumber})</h4>
                      <p className="text-muted-foreground mt-0.5 line-clamp-1">{log.content}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/10 text-muted-foreground">
                      {log.messageType}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(log.sentOn).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Modal: Send Custom WhatsApp Notification ── */}
      <AnimatePresence>
        {showSendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card rounded-2xl p-6 w-full max-w-md border border-[var(--gold)]/20 shadow-2xl relative"
            >
              <h3 className="font-display text-xl font-bold text-foreground mb-1">
                Send WhatsApp Notification
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Push direct templates or custom alerts directly to guests via WhatsApp.
              </p>

              {sendSuccess ? (
                <div className="p-8 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                    <Check className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">Message Sent Successfully!</h4>
                  <p className="text-xs text-muted-foreground">The notification logs have been updated.</p>
                </div>
              ) : (
                <form onSubmit={handleSendSubmit} className="space-y-4">
                  {/* Recipient Phone */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                      Recipient Mobile Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 919876543210 (include country code)"
                      value={sendPhone}
                      onChange={(e) => setSendPhone(e.target.value.replace(/[^\d+]/g, ""))}
                      className="luxury-input w-full px-3 py-2.5 rounded-xl text-sm"
                    />
                  </div>

                  {/* Template Select */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                      Notification Template
                    </label>
                    <select
                      value={sendTemplate}
                      onChange={(e) => {
                        setSendTemplate(e.target.value);
                        setCustomMessage(""); // Reset custom message if selected
                      }}
                      className="luxury-input w-full px-3 py-2.5 rounded-xl text-sm bg-[oklch(0.12_0.02_260)] cursor-pointer"
                    >
                      {TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id} className="bg-[oklch(0.12_0.02_260)]">
                          {t.name}
                        </option>
                      ))}
                      <option value="custom" className="bg-[oklch(0.12_0.02_260)]">
                        -- Custom Message --
                      </option>
                    </select>
                  </div>

                  {/* Preview / Custom Text Body */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                      Message Content Preview
                    </label>
                    {sendTemplate === "custom" ? (
                      <textarea
                        rows={4}
                        placeholder="Type your custom notification body..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        className="luxury-input w-full px-3 py-2 rounded-xl text-sm bg-[oklch(0.12_0.02_260)] resize-none"
                      />
                    ) : (
                      <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-xs font-mono text-muted-foreground leading-relaxed italic">
                        {previewText}
                      </div>
                    )}
                  </div>

                  {sendError && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg text-center">
                      {sendError}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSendModal(false)}
                      className="flex-1 glass rounded-xl py-2.5 text-xs text-muted-foreground border border-white/10 hover:text-foreground transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sending}
                      className="flex-1 gold-btn rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" /> Send Message
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

      {/* ── Modal: View Selected Message Log ── */}
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
                  className="flex-1 gold-btn rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Resend Message
                </button>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex-1 glass rounded-xl py-2 text-xs text-muted-foreground border border-white/10 hover:text-foreground transition-all"
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
