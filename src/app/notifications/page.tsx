"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Bell,
  Code2,
  Award,
  Medal,
  Flame,
  Trophy,
  Megaphone,
  FileText,
  CheckCheck,
  Inbox,
  BellOff,
  type LucideIcon,
} from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types — mirror of GET /api/notifications response
// ---------------------------------------------------------------------------
interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

type Filter = "all" | "unread";

// ---------------------------------------------------------------------------
// Icon resolver
// ---------------------------------------------------------------------------
function notificationIcon(type: string): { Icon: LucideIcon; tint: string } {
  switch ((type || "").toLowerCase()) {
    case "challenge_published":
      return { Icon: Code2, tint: "text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 ring-emerald-500/30" };
    case "achievement":
      return { Icon: Award, tint: "text-amber-600 dark:text-amber-300 bg-amber-500/10 ring-amber-500/30" };
    case "certificate":
      return { Icon: Medal, tint: "text-violet-600 dark:text-violet-300 bg-violet-500/10 ring-violet-500/30" };
    case "streak":
      return { Icon: Flame, tint: "text-rose-600 dark:text-rose-300 bg-rose-500/10 ring-rose-500/30" };
    case "leaderboard":
      return { Icon: Trophy, tint: "text-primary bg-primary/10 ring-primary/30" };
    case "announcement":
      return { Icon: Megaphone, tint: "text-amber-700 dark:text-amber-200 bg-amber-500/15 ring-amber-500/30" };
    case "submission":
      return { Icon: FileText, tint: "text-slate-600 dark:text-slate-300 bg-slate-500/10 ring-slate-500/30" };
    default:
      return { Icon: Bell, tint: "text-muted-foreground bg-muted ring-border" };
  }
}

function relativeTime(iso?: string | null): string {
  if (!iso) return "just now";
  try {
    return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
  } catch {
    return "just now";
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  );
}

function NotificationsContent() {
  const router = useRouter();
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const fetchedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load notifications");
      const json = (await res.json()) as NotificationsResponse;
      setData(json);
    } catch (err) {
      console.error(err);
      // Only show error toast on first load (not on background refreshes)
      if (!fetchedRef.current) {
        toast.error("Could not load notifications.");
      }
    } finally {
      fetchedRef.current = true;
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh every 20s
  useEffect(() => {
    const t = setInterval(() => {
      fetchNotifications();
    }, 20000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  const filtered = useMemo(() => {
    const list = data?.notifications || [];
    if (filter === "unread") return list.filter((n) => !n.read);
    return list;
  }, [data, filter]);

  const unreadCount = data?.unreadCount || 0;

  const markAsRead = useCallback(
    async (id: string) => {
      // Optimistically mark as read locally
      setData((prev) => {
        if (!prev) return prev;
        const next = prev.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        );
        const wasUnread = prev.notifications.find((n) => n.id === id)?.read === false;
        return {
          ...prev,
          notifications: next,
          unreadCount: Math.max(0, prev.unreadCount - (wasUnread ? 1 : 0)),
        };
      });
      setMarkingIds((prev) => new Set(prev).add(id));
      try {
        // The actual API route is POST /api/notifications (no /read subpath exists);
        // body { id } marks that single notification as read.
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setMarkingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [],
  );

  const markAllAsRead = useCallback(async () => {
    setMarkingAll(true);
    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      };
    });
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      toast.success("All notifications marked as read.");
    } catch (err) {
      console.error(err);
      toast.error("Could not mark all as read. Please try again.");
      // Roll back by re-fetching
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  }, [fetchNotifications]);

  const handleRowClick = (n: NotificationItem) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) {
      router.push(n.link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground shadow-sm">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground">
                Stay on top of new challenges, achievements, certificates, and
                announcements.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge className="bg-primary/10 text-primary border-primary/30 gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {unreadCount} unread
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={markingAll || unreadCount === 0}
              className="gap-2"
            >
              {markingAll ? (
                <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all as read
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <Inbox className="h-3.5 w-3.5" /> All
            {(data?.notifications?.length || 0) > 0 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                ({data?.notifications?.length || 0})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-1.5">
            <BellOff className="h-3.5 w-3.5" /> Unread
            {unreadCount > 0 && (
              <span className="text-[10px] text-primary font-bold ml-1">
                ({unreadCount})
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {loading ? (
        <NotificationsSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {filtered.map((n, i) => {
                const { Icon, tint } = notificationIcon(n.type);
                const isUnread = !n.read;
                const clickable = !!n.link;
                return (
                  <motion.li
                    key={n.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.2) }}
                    className={cn(
                      "relative group",
                      isUnread && "bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleRowClick(n)}
                      disabled={markingIds.has(n.id)}
                      className={cn(
                        "w-full text-left px-4 sm:px-5 py-4 flex items-start gap-3 transition-colors",
                        clickable
                          ? "hover:bg-muted/50 cursor-pointer"
                          : "cursor-default",
                        isUnread && "hover:bg-primary/10",
                      )}
                    >
                      {/* Unread dot */}
                      <span
                        className={cn(
                          "absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full",
                          isUnread ? "bg-primary" : "bg-transparent",
                        )}
                        aria-label={isUnread ? "Unread" : "Read"}
                      />
                      {/* Icon */}
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full ring-1 flex items-center justify-center shrink-0",
                          tint,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "font-medium text-sm leading-tight",
                              isUnread ? "text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {n.title}
                          </span>
                          {isUnread && (
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] px-1.5 py-0">
                              NEW
                            </Badge>
                          )}
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                            {n.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {n.message}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                          <span>{relativeTime(n.createdAt)}</span>
                          {n.link && (
                            <span className="inline-flex items-center gap-1 text-primary">
                              Open →
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Mark as read quick action */}
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          disabled={markingIds.has(n.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-muted-foreground hover:text-primary shrink-0 mt-1"
                          aria-label="Mark as read"
                        >
                          {markingIds.has(n.id) ? (
                            <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                          ) : (
                            <CheckCheck className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Auto-refresh hint */}
      {!loading && (data?.notifications?.length || 0) > 0 && (
        <div className="text-center text-[11px] text-muted-foreground">
          Auto-refreshes every 20 seconds · Last updated{" "}
          {relativeTime(new Date().toISOString())}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ filter }: { filter: Filter }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 flex flex-col items-center justify-center gap-4 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl" />
          <div className="relative rounded-full bg-emerald-500/15 p-5 text-emerald-600 dark:text-emerald-300">
            <BellOff className="h-10 w-10" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold">You&apos;re all caught up!</p>
          <p className="text-sm text-muted-foreground max-w-md">
            {filter === "unread"
              ? "No unread notifications — your inbox is clear. New activity will show up here automatically."
              : "No notifications yet. As you solve challenges, earn achievements, or get certificates, you'll see updates here."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Inbox className="h-3.5 w-3.5" />
          Auto-refreshes every 20 seconds
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function NotificationsSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="px-4 sm:px-5 py-4 flex items-start gap-3"
            >
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-20" />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
