"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Wand2, CheckCircle2, AlertTriangle, Lock, Unlock } from "lucide-react";
import { api } from "@/lib/api";

type GoldKind = "acceptable" | "unacceptable";
type GoldStatus = "draft" | "approved";

interface GoldTurn {
  speaker: "user" | "agent";
  content: string;
  note?: string;
}

interface GoldExample {
  id: string;
  test_case_id: string;
  kind: GoldKind;
  transcript: GoldTurn[];
  notes: string | null;
  status: GoldStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface GoldListResponse {
  testCaseId: string;
  gold_gate: "soft" | "strict";
  runnable: boolean;
  examples: GoldExample[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCaseId: string | null;
  testCaseName?: string;
  onChanged?: () => void;
}

function emptyTranscript(): GoldTurn[] {
  return [
    { speaker: "user", content: "" },
    { speaker: "agent", content: "" },
  ];
}

export function GoldExamplesDialog({ open, onOpenChange, testCaseId, testCaseName, onChanged }: Props) {
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<GoldKind | "both" | null>(null);
  const [saving, setSaving] = useState<GoldKind | null>(null);
  const [approving, setApproving] = useState<GoldKind | null>(null);
  const [data, setData] = useState<GoldListResponse | null>(null);

  // Local editable buffers, keyed by kind. We treat the dialog as a controlled editor.
  const [draft, setDraft] = useState<Record<GoldKind, GoldTurn[]>>({
    acceptable: emptyTranscript(),
    unacceptable: emptyTranscript(),
  });
  const [dirty, setDirty] = useState<Record<GoldKind, boolean>>({
    acceptable: false,
    unacceptable: false,
  });

  const hydrateFromServer = useCallback((d: GoldListResponse) => {
    const acc = d.examples.find((e) => e.kind === "acceptable");
    const bad = d.examples.find((e) => e.kind === "unacceptable");
    setDraft({
      acceptable: acc && acc.transcript.length > 0 ? acc.transcript : emptyTranscript(),
      unacceptable: bad && bad.transcript.length > 0 ? bad.transcript : emptyTranscript(),
    });
    setDirty({ acceptable: false, unacceptable: false });
  }, []);

  const fetchList = useCallback(async () => {
    if (!testCaseId) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.testCases.goldList(testCaseId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as GoldListResponse;
      if (!res.ok) throw new Error((json as unknown as { error?: string }).error || "Failed to load");
      setData(json);
      hydrateFromServer(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load gold examples";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [getToken, testCaseId, hydrateFromServer]);

  useEffect(() => {
    if (open && testCaseId) {
      void fetchList();
    } else if (!open) {
      setData(null);
      setDraft({ acceptable: emptyTranscript(), unacceptable: emptyTranscript() });
      setDirty({ acceptable: false, unacceptable: false });
    }
  }, [open, testCaseId, fetchList]);

  const handleGenerate = async (kind: GoldKind | "both") => {
    if (!testCaseId) return;
    setGenerating(kind);
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.testCases.goldGenerate(testCaseId), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to generate");
      toast.success(`Generated ${kind === "both" ? "both examples" : kind + " example"}`);
      await fetchList();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(null);
    }
  };

  const handleSaveDraft = async (kind: GoldKind) => {
    if (!testCaseId) return;
    const transcript = draft[kind].filter((t) => t.content.trim().length > 0);
    if (transcript.length < 2) {
      toast.error("Need at least 2 non-empty turns");
      return;
    }
    setSaving(kind);
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.testCases.goldUpdate(testCaseId, kind), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transcript }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      toast.success("Saved as draft");
      setDirty((d) => ({ ...d, [kind]: false }));
      await fetchList();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const handleApprove = async (kind: GoldKind) => {
    if (!testCaseId) return;
    // If dirty, save first.
    if (dirty[kind]) {
      await handleSaveDraft(kind);
    }
    setApproving(kind);
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.testCases.goldApprove(testCaseId, kind), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to approve");
      toast.success(`${kind} example approved`);
      await fetchList();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setApproving(null);
    }
  };

  const handleUnapprove = async (kind: GoldKind) => {
    if (!testCaseId) return;
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.testCases.goldUnapprove(testCaseId, kind), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to unapprove");
      toast.success(`${kind} example unapproved`);
      await fetchList();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unapprove");
    }
  };

  const updateTurn = (kind: GoldKind, idx: number, field: "speaker" | "content", value: string) => {
    setDraft((d) => {
      const next = [...d[kind]];
      next[idx] = { ...next[idx], [field]: field === "speaker" ? (value as "user" | "agent") : value };
      return { ...d, [kind]: next };
    });
    setDirty((d) => ({ ...d, [kind]: true }));
  };

  const addTurn = (kind: GoldKind) => {
    setDraft((d) => {
      const last = d[kind][d[kind].length - 1];
      const nextSpeaker: "user" | "agent" = last?.speaker === "agent" ? "user" : "agent";
      return { ...d, [kind]: [...d[kind], { speaker: nextSpeaker, content: "" }] };
    });
    setDirty((d) => ({ ...d, [kind]: true }));
  };

  const removeTurn = (kind: GoldKind, idx: number) => {
    setDraft((d) => {
      const next = d[kind].filter((_, i) => i !== idx);
      return { ...d, [kind]: next.length > 0 ? next : emptyTranscript() };
    });
    setDirty((d) => ({ ...d, [kind]: true }));
  };

  const examples = data?.examples || [];
  const acceptable = examples.find((e) => e.kind === "acceptable");
  const unacceptable = examples.find((e) => e.kind === "unacceptable");

  const renderColumn = (kind: GoldKind) => {
    const meta = kind === "acceptable" ? acceptable : unacceptable;
    const isApproved = meta?.status === "approved";
    const isAcc = kind === "acceptable";

    return (
      <div className="flex-1 min-w-0 flex flex-col border rounded-lg overflow-hidden">
        <div
          className={`px-4 py-2 border-b flex items-center justify-between ${
            isAcc ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {isAcc ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <span className="font-medium">
              {isAcc ? "Acceptable" : "Unacceptable"} example
            </span>
            {meta && (
              <Badge variant={isApproved ? "default" : "secondary"} className="text-xs">
                {isApproved ? "Approved" : "Draft"}
              </Badge>
            )}
            {dirty[kind] && (
              <Badge variant="outline" className="text-xs">
                Unsaved
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleGenerate(kind)}
              disabled={generating !== null}
              title="Regenerate via AI"
            >
              {generating === kind ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="p-3 space-y-2 overflow-y-auto max-h-[55vh]">
          {draft[kind].map((turn, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <select
                className="text-xs border rounded px-2 py-1 bg-background w-24"
                value={turn.speaker}
                onChange={(e) => updateTurn(kind, idx, "speaker", e.target.value)}
              >
                <option value="user">USER</option>
                <option value="agent">AGENT</option>
              </select>
              <Textarea
                value={turn.content}
                placeholder={turn.speaker === "user" ? "What the caller says…" : "What the agent says…"}
                rows={2}
                className="flex-1 text-sm"
                onChange={(e) => updateTurn(kind, idx, "content", e.target.value)}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={() => removeTurn(kind, idx)}
                title="Remove turn"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => addTurn(kind)}
          >
            <Plus className="h-3 w-3 mr-1" /> Add turn
          </Button>
        </div>

        <div className="px-3 py-2 border-t flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSaveDraft(kind)}
            disabled={saving === kind}
          >
            {saving === kind ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
            Save draft
          </Button>
          {isApproved ? (
            <Button size="sm" variant="ghost" onClick={() => handleUnapprove(kind)}>
              <Unlock className="h-3 w-3 mr-1" /> Unapprove
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => handleApprove(kind)}
              disabled={approving === kind}
            >
              {approving === kind ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
              Approve
            </Button>
          )}
        </div>
      </div>
    );
  };

  const isStrict = data?.gold_gate === "strict";
  const runnable = data?.runnable ?? true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Gold reference conversations
            {testCaseName && <span className="text-muted-foreground font-normal">· {testCaseName}</span>}
            {isStrict ? (
              <Badge variant={runnable ? "default" : "destructive"} className="text-xs">
                <Lock className="h-3 w-3 mr-1" /> Strict gate
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Unlock className="h-3 w-3 mr-1" /> Soft gate
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Approve one ACCEPTABLE and one UNACCEPTABLE conversation. The evaluator will grade every
            real test run for this case by comparison against these two references.
            {isStrict && !runnable && (
              <span className="block mt-1 text-destructive font-medium">
                This test case is strict-gated and cannot run until BOTH examples are approved.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1">
              <Button
                size="sm"
                onClick={() => handleGenerate("both")}
                disabled={generating !== null}
              >
                {generating === "both" ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Wand2 className="h-3 w-3 mr-1" />
                )}
                Generate both with AI
              </Button>
              <Label className="text-xs text-muted-foreground ml-2">
                Edits are saved as drafts. Approve to make them count.
              </Label>
            </div>
            <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden mt-2">
              {renderColumn("acceptable")}
              {renderColumn("unacceptable")}
            </div>
          </>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
