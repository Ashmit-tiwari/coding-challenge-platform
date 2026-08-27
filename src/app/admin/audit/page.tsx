"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ScrollText, Filter, ChevronDown, ChevronUp, Loader2, User, Globe, Calendar, ShieldCheck,
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { fmtDateTime, relTime } from "@/app/admin/_lib";

interface AuditRow {
  id: string;
  action: string;
  target?: string | null;
  details: any;
  admin?: string | null;
  ip?: string | null;
  createdAt: string;
}

const ACTION_COLOR: Record<string, string> = {
  admin_login: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  user_ban: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  user_unban: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  user_xp_adjust: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  challenge_create: "bg-primary/15 text-primary border-primary/30",
  challenge_edit: "bg-primary/15 text-primary border-primary/30",
  challenge_delete: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  flag_review: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  integrity_recompute: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  settings_update: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  view_submission: "bg-muted text-muted-foreground border-border",
};

function actionColor(a: string) {
  return ACTION_COLOR[a] || "bg-muted text-muted-foreground border-border";
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (action !== "all") params.set("action", action);
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!res.ok) { toast.error("Failed to load audit log"); setLogs([]); return; }
      const d = await res.json();
      setLogs(d.logs || []);
    } catch {
      toast.error("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actionOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return Array.from(set).sort();
  }, [logs]);

  return (
    <AdminGuard>
      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="flex items-center gap-3">
            <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
              <p className="text-sm text-muted-foreground">
                Every administrative action is recorded with actor, target and timestamp. Last 200 entries shown.
              </p>
            </div>
          </div>
        </motion.div>

        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-end gap-3">
              <div className="w-72">
                <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Filter className="h-3 w-3" /> Filter by action
                </div>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {actionOptions.map((a) => <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar max-h-[680px]">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <TableHead className="font-medium">Action</TableHead>
                    <TableHead className="font-medium">Target</TableHead>
                    <TableHead className="font-medium">Admin</TableHead>
                    <TableHead className="font-medium">Details</TableHead>
                    <TableHead className="font-medium">IP</TableHead>
                    <TableHead className="font-medium">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                        <div className="inline-flex flex-col items-center gap-2">
                          <ScrollText className="h-8 w-8 text-muted-foreground/50" />
                          <div>No audit log entries match the current filter.</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : logs.map((l) => {
                    const hasDetails = l.details && Object.keys(l.details || {}).length > 0;
                    const isOpen = !!expanded[l.id];
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <span className={cn("inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border font-mono", actionColor(l.action))}>
                            {l.action}
                          </span>
                        </TableCell>
                        <TableCell>
                          {l.target ? (
                            <span className="text-xs font-mono text-muted-foreground">{l.target.slice(0, 16)}{l.target.length > 16 ? "…" : ""}</span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5 text-xs">
                            <ShieldCheck className="h-3 w-3 text-primary/70" />
                            <span className="font-medium">{l.admin || "system"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasDetails ? (
                            <Collapsible open={isOpen} onOpenChange={(o) => setExpanded((e) => ({ ...e, [l.id]: o }))}>
                              <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                View details
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap break-words rounded-md bg-muted/40 border border-border/60 p-2 max-w-md">
                                  {JSON.stringify(l.details, null, 2)}
                                </pre>
                              </CollapsibleContent>
                            </Collapsible>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {l.ip ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                              <Globe className="h-3 w-3" />
                              {l.ip}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground" title={fmtDateTime(l.createdAt)}>
                            {relTime(l.createdAt)}
                          </div>
                          <div className="text-[10px] text-muted-foreground/70">{fmtDateTime(l.createdAt)}</div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {!loading && logs.length > 0 && (
              <div className="px-4 py-3 border-t border-border/60 text-xs text-muted-foreground">
                Showing {logs.length} audit log entries.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
