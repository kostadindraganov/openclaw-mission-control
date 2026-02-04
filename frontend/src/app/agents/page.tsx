"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SignInButton, SignedIn, SignedOut, useAuth } from "@clerk/nextjs";

import { StatusPill } from "@/components/atoms/StatusPill";
import { DashboardSidebar } from "@/components/organisms/DashboardSidebar";
import { DashboardShell } from "@/components/templates/DashboardShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Agent = {
  id: string;
  name: string;
  status: string;
  last_seen_at: string;
};

type ActivityEvent = {
  id: string;
  event_type: string;
  message?: string | null;
  created_at: string;
};

type GatewayStatus = {
  connected: boolean;
  gateway_url: string;
  sessions_count?: number;
  sessions?: Record<string, unknown>[];
  error?: string;
};

const apiBase =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8000";

const statusOptions = [
  { value: "online", label: "Online" },
  { value: "busy", label: "Busy" },
  { value: "offline", label: "Offline" },
];

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelative = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const getSessionKey = (
  session: Record<string, unknown>,
  index: number
) => {
  const key = session.key;
  if (typeof key === "string" && key.length > 0) {
    return key;
  }
  const sessionId = session.sessionId;
  if (typeof sessionId === "string" && sessionId.length > 0) {
    return sessionId;
  }
  return `session-${index}`;
};

export default function AgentsPage() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [gatewaySessions, setGatewaySessions] = useState<
    Record<string, unknown>[]
  >([]);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<
    Record<string, unknown> | null
  >(null);
  const [sessionHistory, setSessionHistory] = useState<unknown[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("online");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const sortedAgents = useMemo(
    () => [...agents].sort((a, b) => a.name.localeCompare(b.name)),
    [agents],
  );

  const loadData = async () => {
    if (!isSignedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [agentsResponse, activityResponse] = await Promise.all([
        fetch(`${apiBase}/api/v1/agents`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }),
        fetch(`${apiBase}/api/v1/activity`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }),
      ]);
      if (!agentsResponse.ok || !activityResponse.ok) {
        throw new Error("Unable to load operational data.");
      }
      const agentsData = (await agentsResponse.json()) as Agent[];
      const eventsData = (await activityResponse.json()) as ActivityEvent[];
      setAgents(agentsData);
      setEvents(eventsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadGateway = async () => {
    if (!isSignedIn) return;
    setGatewayError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/gateway/status`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!response.ok) {
        throw new Error("Unable to load gateway status.");
      }
      const statusData = (await response.json()) as GatewayStatus;
      setGatewayStatus(statusData);
      setGatewaySessions(statusData.sessions ?? []);
    } catch (err) {
      setGatewayError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const loadSessionHistory = async (sessionId: string) => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      const response = await fetch(
        `${apiBase}/api/v1/gateway/sessions/${sessionId}/history`,
        {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }
      );
      if (!response.ok) {
        throw new Error("Unable to load session history.");
      }
      const data = (await response.json()) as { history?: unknown[] };
      setSessionHistory(data.history ?? []);
    } catch (err) {
      setGatewayError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  useEffect(() => {
    loadData();
    loadGateway();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const resetForm = () => {
    setName("");
    setStatus("online");
    setCreateError(null);
  };

  const handleCreate = async () => {
    if (!isSignedIn) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateError("Agent name is required.");
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ name: trimmed, status }),
      });
      if (!response.ok) {
        throw new Error("Unable to create agent.");
      }
      const created = (await response.json()) as Agent;
      setAgents((prev) => [created, ...prev]);
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!isSignedIn || !selectedSession) return;
    const content = message.trim();
    if (!content) return;
    setIsSending(true);
    setGatewayError(null);
    try {
      const token = await getToken();
      const sessionId = selectedSession.key as string | undefined;
      if (!sessionId) {
        throw new Error("Missing session id.");
      }
      const response = await fetch(
        `${apiBase}/api/v1/gateway/sessions/${sessionId}/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ content }),
        }
      );
      if (!response.ok) {
        throw new Error("Unable to send message.");
      }
      setMessage("");
      loadSessionHistory(sessionId);
    } catch (err) {
      setGatewayError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DashboardShell>
      <SignedOut>
        <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl surface-panel p-10 text-center">
          <p className="text-sm text-muted">
            Sign in to view operational status.
          </p>
          <SignInButton
            mode="modal"
            afterSignInUrl="/agents"
            afterSignUpUrl="/agents"
            forceRedirectUrl="/agents"
            signUpForceRedirectUrl="/agents"
          >
            <Button>Sign in</Button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <DashboardSidebar />
        <div className="flex h-full flex-col gap-6 rounded-2xl surface-panel p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-quiet">
                Operations
              </p>
              <h1 className="text-2xl font-semibold text-strong">Agents</h1>
              <p className="text-sm text-muted">
                Live status and heartbeat activity across all agents.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => loadData()}
                disabled={isLoading}
              >
                Refresh
              </Button>
              <Button onClick={() => setIsDialogOpen(true)}>
                New agent
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-xs text-muted">
              {error}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]">
              <div className="flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-quiet">
                  Agents
                </p>
                <p className="text-xs text-quiet">
                  {sortedAgents.length} total
                </p>
              </div>
              <div className="divide-y divide-[color:var(--border)] text-sm">
                {sortedAgents.length === 0 && !isLoading ? (
                  <div className="p-6 text-sm text-muted">
                    No agents yet. Add one or wait for a heartbeat.
                  </div>
                ) : (
                  sortedAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-strong">{agent.name}</p>
                        <p className="text-xs text-quiet">
                          Last seen {formatRelative(agent.last_seen_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill status={agent.status} />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/boards`)}
                        >
                          View work
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-5">
              <Tabs defaultValue="activity">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <TabsList>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="gateway">Gateway</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="activity">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-quiet">
                      Activity feed
                    </p>
                    <p className="text-xs text-quiet">
                      {events.length} events
                    </p>
                  </div>
                  <div className="space-y-3">
                    {events.length === 0 && !isLoading ? (
                      <div className="rounded-lg border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-muted">
                        No activity yet.
                      </div>
                    ) : (
                      events.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-muted"
                        >
                          <p className="font-medium text-strong">
                            {event.message ?? event.event_type}
                          </p>
                          <p className="mt-1 text-xs text-quiet">
                            {formatTimestamp(event.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="gateway">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-quiet">
                      OpenClaw Gateway
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadGateway()}
                    >
                      Refresh
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-muted">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-strong">
                          {gatewayStatus?.connected ? "Connected" : "Not connected"}
                        </p>
                        <StatusPill
                          status={gatewayStatus?.connected ? "online" : "offline"}
                        />
                      </div>
                      <p className="mt-1 text-xs text-quiet">
                        {gatewayStatus?.gateway_url ?? "Gateway URL not set"}
                      </p>
                      {gatewayStatus?.error ? (
                        <p className="mt-2 text-xs text-[color:var(--danger)]">
                          {gatewayStatus.error}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)]">
                      <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-quiet">
                        <span>Sessions</span>
                        <span>{gatewaySessions.length}</span>
                      </div>
                      <div className="max-h-56 divide-y divide-[color:var(--border)] overflow-y-auto text-sm">
                        {gatewaySessions.length === 0 ? (
                          <div className="p-4 text-sm text-muted">
                            No sessions found.
                          </div>
                        ) : (
                          gatewaySessions.map((session, index) => {
                            const sessionId = session.key as string | undefined;
                            const display =
                              (session.displayName as string | undefined) ??
                              (session.label as string | undefined) ??
                              sessionId ??
                              "Session";
                            return (
                              <button
                                key={getSessionKey(session, index)}
                                type="button"
                                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-[color:var(--surface-muted)]"
                                onClick={() => {
                                  setSelectedSession(session);
                                  if (sessionId) {
                                    loadSessionHistory(sessionId);
                                  }
                                }}
                              >
                                <div>
                                  <p className="font-medium text-strong">{display}</p>
                                  <p className="text-xs text-quiet">
                                    {session.status ?? "active"}
                                  </p>
                                </div>
                                <span className="text-xs text-quiet">Open</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {selectedSession ? (
                      <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-muted">
                        <div className="mb-3 space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-quiet">
                            Session details
                          </p>
                          <p className="font-medium text-strong">
                            {selectedSession.displayName ??
                              selectedSession.label ??
                              selectedSession.key ??
                              "Session"}
                          </p>
                        </div>
                        <div className="mb-4 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-xs text-muted">
                          {sessionHistory.length === 0 ? (
                            <p>No history loaded.</p>
                          ) : (
                            sessionHistory.map((item, index) => (
                              <pre key={index} className="whitespace-pre-wrap">
                                {JSON.stringify(item, null, 2)}
                              </pre>
                            ))
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-quiet">
                            Send message
                          </label>
                          <Input
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder="Type a message to the session"
                            className="h-10"
                          />
                          <Button
                            className="w-full"
                            onClick={handleSendMessage}
                            disabled={isSending}
                          >
                            {isSending ? "Sending…" : "Send to session"}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {gatewayError ? (
                      <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-xs text-[color:var(--danger)]">
                        {gatewayError}
                      </div>
                    ) : null}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </SignedIn>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(nextOpen) => {
          setIsDialogOpen(nextOpen);
          if (!nextOpen) {
            resetForm();
          }
        }}
      >
        <DialogContent aria-label="New agent">
          <DialogHeader>
            <DialogTitle>New agent</DialogTitle>
            <DialogDescription>
              Add a manual agent entry for tracking and monitoring.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-strong">Agent name</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Deployment bot"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-strong">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createError ? (
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-xs text-muted">
                {createError}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? "Creating…" : "Create agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
