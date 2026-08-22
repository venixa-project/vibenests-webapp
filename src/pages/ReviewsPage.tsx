import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  Search, Star, Trash2, Calendar, Loader2, ArrowUpDown, Filter,
} from "lucide-react";
import { reviewsApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ReviewUser {
  id: number;
  fullName: string;
  email: string;
}

interface ReviewType {
  id: number;
  overall: number;
  ambience: number;
  cleanliness: number;
  service: number;
  decoration: number;
  value: number;
  comment: string;
  createdAt: string;
  user: ReviewUser;
  suiteName?: string;
}

export default function ReviewsPage() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest">("newest");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    setLoading(true);
    setError(null);
    try {
      const data = await reviewsApi.getAll();
      setReviews(data);
    } catch (err: any) {
      setError(err.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    setDeletingId(id);
    try {
      await reviewsApi.remove(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Review deleted successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete review.");
    } finally {
      setDeletingId(null);
    }
  }

  // Calculate statistics
  const totalReviews = reviews.length;
  
  const getAverage = (key: keyof ReviewType) => {
    if (totalReviews === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + Number(r[key] || 0), 0);
    return Number((sum / totalReviews).toFixed(1));
  };

  const avgOverall = getAverage("overall");
  const avgAmbience = getAverage("ambience");
  const avgCleanliness = getAverage("cleanliness");
  const avgService = getAverage("service");
  const avgDecoration = getAverage("decoration");
  const avgValue = getAverage("value");

  // Star breakdown
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const rInt = Math.round(r.overall) as 5 | 4 | 3 | 2 | 1;
    if (starCounts[rInt] !== undefined) {
      starCounts[rInt]++;
    }
  });

  // Filter & Sort reviews
  const filteredReviews = reviews
    .filter((r) => {
      const matchSearch =
        r.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.comment?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchRating =
        ratingFilter === "All" ||
        Math.round(r.overall).toString() === ratingFilter;

      return matchSearch && matchRating;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "highest") {
        return b.overall - a.overall;
      }
      if (sortBy === "lowest") {
        return a.overall - b.overall;
      }
      return 0;
    });

  return (
    <div className="flex-1 overflow-y-auto bg-[oklch(0.09_0.02_260)] text-foreground">
      <AdminHeader title="Guest Ratings & Reviews" />
      
      <div className="p-4 sm:p-6 space-y-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
            <p className="text-sm">Loading ratings and reviews...</p>
          </div>
        ) : error ? (
          <div className="glass-card rounded-2xl p-8 text-center max-w-md mx-auto border border-rose-500/20">
            <p className="text-rose-400 font-semibold mb-2">Error Loading Data</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button onClick={fetchReviews} className="gold-btn px-4 py-2 rounded-lg text-xs font-semibold">
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Stats Dashboard grid */}
            <div className="grid md:grid-cols-3 gap-5">
              
              {/* Overall Score Card */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Overall Satisfaction</h4>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-display font-bold text-gradient-gold">{avgOverall}</span>
                    <span className="text-sm text-muted-foreground">/ 5.0</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(avgOverall)
                            ? "fill-gold text-gold"
                            : "fill-transparent text-white/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-4 pt-4 border-t border-white/5">
                  Based on {totalReviews} verified guest reviews
                </p>
              </div>

              {/* Rating Distribution Progress */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-2.5">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Rating Breakdown</h4>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = starCounts[star as 5 | 4 | 3 | 2 | 1] || 0;
                  const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <span className="w-3 text-muted-foreground font-mono">{star}</span>
                      <Star className="h-3 w-3 text-gold fill-gold shrink-0" />
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-gold rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted-foreground font-mono">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Category Breakdown list */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Category Scores</h4>
                {[
                  { label: "Ambience", score: avgAmbience },
                  { label: "Cleanliness", score: avgCleanliness },
                  { label: "Service", score: avgService },
                  { label: "Decoration", score: avgDecoration },
                  { label: "Value for Money", score: avgValue },
                ].map(({ label, score }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold text-gold font-mono">{score}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold/60 rounded-full"
                        style={{ width: `${(score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Filter controls */}
            <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3 border border-white/5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search reviews by guest name, email, or comment keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="luxury-input w-full rounded-lg pl-9 pr-4 py-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="luxury-input rounded-lg px-3 py-2 text-xs text-foreground bg-transparent cursor-pointer"
                >
                  <option value="All" className="bg-[oklch(0.13_0.025_260)]">All Ratings</option>
                  <option value="5" className="bg-[oklch(0.13_0.025_260)]">5 Stars</option>
                  <option value="4" className="bg-[oklch(0.13_0.025_260)]">4 Stars</option>
                  <option value="3" className="bg-[oklch(0.13_0.025_260)]">3 Stars</option>
                  <option value="2" className="bg-[oklch(0.13_0.025_260)]">2 Stars</option>
                  <option value="1" className="bg-[oklch(0.13_0.025_260)]">1 Star</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="luxury-input rounded-lg px-3 py-2 text-xs text-foreground bg-transparent cursor-pointer"
                >
                  <option value="newest" className="bg-[oklch(0.13_0.025_260)]">Newest First</option>
                  <option value="highest" className="bg-[oklch(0.13_0.025_260)]">Highest Rating</option>
                  <option value="lowest" className="bg-[oklch(0.13_0.025_260)]">Lowest Rating</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setRatingFilter("All");
                  setSortBy("newest");
                }}
                className="text-xs text-muted-foreground hover:text-gold transition px-3 py-2 rounded-lg border border-white/10 hover:border-gold/30"
              >
                Reset
              </button>
            </div>

            {/* Reviews list */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-display text-lg font-medium text-foreground">Guest Reviews</h3>
                <span className="text-xs text-muted-foreground">
                  Showing {filteredReviews.length} of {totalReviews} reviews
                </span>
              </div>

              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredReviews.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="glass-card rounded-2xl p-12 text-center text-sm text-muted-foreground border border-white/5"
                    >
                      No reviews found matching filters.
                    </motion.div>
                  ) : (
                    filteredReviews.map((r) => {
                      const userLetter = r.user?.fullName?.charAt(0).toUpperCase() || "G";
                      const reviewDate = new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                      
                      return (
                        <motion.div
                          key={r.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col md:flex-row gap-5 justify-between items-start"
                        >
                          <div className="space-y-3 flex-1 min-w-0">
                            
                            {/* Reviewer detail header */}
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center font-bold text-gold text-sm shrink-0">
                                {userLetter}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
                                  {r.user?.fullName || "Anonymous Guest"}
                                  {r.suiteName && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] bg-gold/10 border border-gold/20 text-gold uppercase tracking-wider font-semibold">
                                      {r.suiteName}
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {r.user?.email || "No email"}
                                </p>
                              </div>
                              <span className="text-[10px] text-muted-foreground ml-auto md:hidden">
                                {reviewDate}
                              </span>
                            </div>

                            {/* Ratings tags */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Overall star badge */}
                              <div className="flex items-center gap-1 bg-gold/10 border border-gold/20 rounded-full px-2.5 py-0.5 text-xs font-semibold text-gold">
                                <Star className="h-3 w-3 fill-gold text-gold" />
                                {r.overall.toFixed(1)} Overall
                              </div>

                              {/* Minor category rating counts */}
                              {[
                                { key: "Ambience", val: r.ambience },
                                { key: "Cleanliness", val: r.cleanliness },
                                { key: "Service", val: r.service },
                                { key: "Decoration", val: r.decoration },
                                { key: "Value", val: r.value },
                              ].map(({ key, val }) => (
                                val > 0 && (
                                  <span
                                    key={key}
                                    className="bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-[10px] text-muted-foreground font-mono"
                                  >
                                    {key}: {val}★
                                  </span>
                                )
                              ))}
                            </div>

                            {/* Comment */}
                            {r.comment ? (
                              <div className="bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-foreground/90 italic leading-relaxed">
                                "{r.comment}"
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                No written comment provided.
                              </p>
                            )}

                          </div>

                          {/* Action area */}
                          <div className="flex md:flex-col items-end justify-between w-full md:w-auto shrink-0 border-t md:border-t-0 border-white/5 pt-3 md:pt-0 self-stretch md:self-auto">
                            <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                              {reviewDate}
                            </span>
                            <button
                              onClick={() => handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              className="p-2 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50 flex items-center justify-center gap-1 ml-auto cursor-pointer"
                              title="Delete/Moderate Review"
                            >
                              {deletingId === r.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              <span className="text-xs md:hidden">Delete</span>
                            </button>
                          </div>

                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
