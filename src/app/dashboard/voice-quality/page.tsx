"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { AudioLines, Loader2 } from "lucide-react";

type Tab = "tts" | "asr" | "codeswitch" | "pronunciation" | "pitch";

const TABS: { id: Tab; label: string }[] = [
  { id: "tts", label: "TTS Quality" },
  { id: "asr", label: "ASR Quality" },
  { id: "codeswitch", label: "Code-Switching" },
  { id: "pronunciation", label: "Pronunciation" },
  { id: "pitch", label: "Pitch Consistency" },
];

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-100 text-green-800" : score >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  return <span className={`inline-block px-2 py-1 rounded text-sm font-semibold ${color}`}>{score}</span>;
}

export default function VoiceQualityPage() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<Tab>("tts");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  // form fields
  const [spokenText, setSpokenText] = useState("");
  const [audioDurationMs, setAudioDurationMs] = useState("");
  const [expectedScript, setExpectedScript] = useState("");
  const [actualTranscript, setActualTranscript] = useState("");
  const [transcript, setTranscript] = useState("");
  const [expectedPhrases, setExpectedPhrases] = useState("");
  const [language, setLanguage] = useState("en");
  const [filename, setFilename] = useState("");

  const post = async (url: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const token = await getToken();
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) setResult(data);
      else setError(data.error || "Request failed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const run = () => {
    if (tab === "tts") return post(`${api.baseUrl}/api/voice-quality/tts`, { spokenText, audioDurationMs: Number(audioDurationMs) || undefined });
    if (tab === "asr") return post(`${api.baseUrl}/api/voice-quality/asr`, { expectedScript, actualTranscript });
    if (tab === "codeswitch") return post(`${api.baseUrl}/api/multi-language/detect-code-switching`, { transcript });
    if (tab === "pronunciation")
      return post(`${api.baseUrl}/api/multi-language/analyze-pronunciation`, {
        spokenText,
        expectedPhrases: expectedPhrases.split("\n").map((s) => s.trim()).filter(Boolean),
        language,
      });
    if (tab === "pitch") return post(`${api.baseUrl}/api/voice-quality/pitch`, { filename });
  };

  const field = "w-full border rounded-md px-3 py-2 text-sm bg-background";
  const r = result as Record<string, unknown> | null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AudioLines className="h-6 w-6" /> Voice &amp; Language Quality
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          TTS naturalness, ASR accuracy, multilingual code-switching, pronunciation drift and pitch consistency.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setResult(null);
              setError(null);
            }}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id ? "border-[#1A5253] text-[#1A5253]" : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-3">
        {tab === "tts" && (
          <>
            <p className="text-sm text-muted-foreground">Evaluate spoken text for naturalness (WPM, prosody, acronym over-pronunciation, pauses).</p>
            <textarea className={field} rows={4} placeholder="Agent spoken text…" value={spokenText} onChange={(e) => setSpokenText(e.target.value)} />
            <input className={field} placeholder="Audio duration in ms (optional, enables WPM)" value={audioDurationMs} onChange={(e) => setAudioDurationMs(e.target.value)} />
          </>
        )}
        {tab === "asr" && (
          <>
            <p className="text-sm text-muted-foreground">Compare what the caller was scripted to say vs the captured transcript.</p>
            <textarea className={field} rows={3} placeholder="Expected script…" value={expectedScript} onChange={(e) => setExpectedScript(e.target.value)} />
            <textarea className={field} rows={3} placeholder="Actual transcript…" value={actualTranscript} onChange={(e) => setActualTranscript(e.target.value)} />
          </>
        )}
        {tab === "codeswitch" && (
          <>
            <p className="text-sm text-muted-foreground">Detect mid-conversation language switches in a transcript.</p>
            <textarea className={field} rows={6} placeholder="Full transcript…" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
          </>
        )}
        {tab === "pronunciation" && (
          <>
            <p className="text-sm text-muted-foreground">Flag pronunciation / name drift against expected phrases (one per line).</p>
            <textarea className={field} rows={3} placeholder="Spoken text…" value={spokenText} onChange={(e) => setSpokenText(e.target.value)} />
            <textarea className={field} rows={3} placeholder={"Expected phrases (one per line)…"} value={expectedPhrases} onChange={(e) => setExpectedPhrases(e.target.value)} />
            <select className={field} value={language} onChange={(e) => setLanguage(e.target.value)}>
              {["en", "es", "fr", "de", "pt", "hi", "ar", "zh", "ja", "ko"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </>
        )}
        {tab === "pitch" && (
          <>
            <p className="text-sm text-muted-foreground">
              Analyse pitch/voice consistency from a recording. Enter the recording filename (from a result&apos;s audio URL,
              e.g. <code>&lt;runId&gt;_&lt;batchId&gt;.raw</code>).
            </p>
            <input className={field} placeholder="recording filename or /api/audio/<file>" value={filename} onChange={(e) => setFilename(e.target.value)} />
          </>
        )}

        <button onClick={run} disabled={loading} className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Analyse
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {r && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-3">Result</h2>
          {/* Score-bearing summaries */}
          <div className="flex flex-wrap gap-6 mb-4 text-sm">
            {typeof r.score === "number" && (<div className="flex items-center gap-2">Score <ScoreBadge score={r.score as number} /></div>)}
            {typeof r.similarity === "number" && (<div className="flex items-center gap-2">Similarity <ScoreBadge score={r.similarity as number} /></div>)}
            {typeof r.consistencyScore === "number" && (<div className="flex items-center gap-2">Consistency <ScoreBadge score={r.consistencyScore as number} /></div>)}
            {typeof r.overallScore === "number" && (<div className="flex items-center gap-2">Overall <ScoreBadge score={r.overallScore as number} /></div>)}
            {typeof r.rating === "string" && (<div className="capitalize">Rating: <span className="font-medium">{(r.rating as string).replace(/_/g, " ")}</span></div>)}
            {typeof r.detected === "boolean" && (<div>Code-switching: <span className="font-medium">{r.detected ? "Detected" : "None"}</span></div>)}
            {typeof r.meanCentroidHz === "number" && (<div>Mean centroid: <span className="font-medium">{r.meanCentroidHz as number} Hz</span> ({r.framesAnalysed as number} frames)</div>)}
          </div>
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded p-3 overflow-x-auto">{JSON.stringify(r, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
