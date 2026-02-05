"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  FileSearch,
  Scale,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Types
interface ImplicitInference {
  sourceStatement: string;
  turnNumber: number;
  inferredAttribute: string;
  category: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  regulations: string[];
  recommendation: string;
}

interface InferenceScanResult {
  id: string;
  testResultId: string;
  scanStatus: "pending" | "scanning" | "completed" | "failed";
  overallRiskScore: number;
  complianceFlags: string[];
  actionRequired: boolean;
  inferences: ImplicitInference[];
  scannedAt: string;
  errorMessage?: string;
}

// Risk level colors and icons
const riskLevelConfig = {
  critical: { color: "bg-red-500 text-white", icon: XCircle, label: "Critical" },
  high: { color: "bg-orange-500 text-white", icon: AlertTriangle, label: "High" },
  medium: { color: "bg-yellow-500 text-black", icon: Info, label: "Medium" },
  low: { color: "bg-blue-500 text-white", icon: CheckCircle, label: "Low" },
};

// Category icons
const categoryIcons: Record<string, string> = {
  age: "👶",
  health: "🏥",
  religion: "🙏",
  disability: "♿",
  sexuality: "🏳️‍🌈",
  financial: "💰",
  political: "🗳️",
  ethnicity: "🌍",
  other: "❓",
};

interface InferenceScanPanelProps {
  testResultId: string;
  existingScan?: InferenceScanResult | null;
  onScanComplete?: (scan: InferenceScanResult) => void;
}

export function InferenceScanPanel({
  testResultId,
  existingScan,
  onScanComplete,
}: InferenceScanPanelProps) {
  const { getToken } = useAuth();
  const [scan, setScan] = useState<InferenceScanResult | null>(existingScan || null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedInference, setExpandedInference] = useState<number | null>(null);

  const runScan = async () => {
    setIsScanning(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(
        api.endpoints.testResults.scanInferences(testResultId),
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to scan");
      }

      const scanResult = await response.json();
      setScan(scanResult);
      onScanComplete?.(scanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run scan");
    } finally {
      setIsScanning(false);
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 75) return "text-red-600";
    if (score >= 50) return "text-orange-500";
    if (score >= 25) return "text-yellow-600";
    return "text-green-600";
  };

  const getRiskScoreBg = (score: number) => {
    if (score >= 75) return "bg-red-50 border-red-200";
    if (score >= 50) return "bg-orange-50 border-orange-200";
    if (score >= 25) return "bg-yellow-50 border-yellow-200";
    return "bg-green-50 border-green-200";
  };

  // No scan yet
  if (!scan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Implicit Inference Scanner
          </CardTitle>
          <CardDescription>
            AI-powered detection of sensitive information inferred from conversation context
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center py-6">
            <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Scan this conversation for implicit inferences about age, health, religion,
              disability, and other protected categories.
            </p>
            <Button onClick={runScan} disabled={isScanning}>
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Run Compliance Scan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Scan in progress
  if (scan.scanStatus === "scanning" || scan.scanStatus === "pending") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Implicit Inference Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Analyzing conversation for implicit inferences...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Scan failed
  if (scan.scanStatus === "failed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Implicit Inference Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Scan Failed</AlertTitle>
            <AlertDescription>{scan.errorMessage || "Unknown error occurred"}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={runScan} variant="outline">
              <Shield className="mr-2 h-4 w-4" />
              Retry Scan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Scan completed - show results
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Implicit Inference Scan Results
            </CardTitle>
            <CardDescription>
              Scanned {new Date(scan.scannedAt).toLocaleString()}
            </CardDescription>
          </div>
          <Button onClick={runScan} variant="outline" size="sm" disabled={isScanning}>
            {isScanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Rescan"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Score Overview */}
        <div className={`p-4 rounded-lg border ${getRiskScoreBg(scan.overallRiskScore)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overall Risk Score</p>
              <p className={`text-3xl font-bold ${getRiskScoreColor(scan.overallRiskScore)}`}>
                {scan.overallRiskScore.toFixed(1)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">Inferences Detected</p>
              <p className="text-2xl font-bold">{scan.inferences.length}</p>
            </div>
          </div>

          {scan.actionRequired && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                Critical or high-risk inferences detected. Review immediately.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Compliance Flags */}
        {scan.complianceFlags.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Applicable Regulations
            </p>
            <div className="flex flex-wrap gap-2">
              {scan.complianceFlags.map((flag) => (
                <Badge key={flag} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {flag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* No Inferences */}
        {scan.inferences.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-green-700">No Implicit Inferences Detected</p>
            <p className="text-muted-foreground">
              This conversation appears to be compliant with no sensitive information inferred.
            </p>
          </div>
        )}

        {/* Inference List */}
        {scan.inferences.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Detected Inferences</p>
            {scan.inferences.map((inference, index) => {
              const isExpanded = expandedInference === index;
              const RiskIcon = riskLevelConfig[inference.riskLevel].icon;

              return (
                <div
                  key={index}
                  className={`border rounded-lg overflow-hidden transition-all ${
                    isExpanded ? "ring-2 ring-primary" : ""
                  }`}
                >
                  {/* Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/50 flex items-start gap-3"
                    onClick={() => setExpandedInference(isExpanded ? null : index)}
                  >
                    <span className="text-2xl">{categoryIcons[inference.category] || "❓"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={riskLevelConfig[inference.riskLevel].color}>
                          <RiskIcon className="h-3 w-3 mr-1" />
                          {riskLevelConfig[inference.riskLevel].label}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {inference.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Turn {inference.turnNumber}
                        </span>
                      </div>
                      <p className="font-medium">{inference.inferredAttribute}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        &quot;{inference.sourceStatement}&quot;
                      </p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="text-right">
                            <span className="text-sm font-medium">
                              {(inference.confidence * 100).toFixed(0)}%
                            </span>
                            <p className="text-xs text-muted-foreground">confidence</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>AI confidence in this inference</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30 p-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Source Statement</p>
                        <p className="text-sm bg-white p-3 rounded border italic">
                          &quot;{inference.sourceStatement}&quot;
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Applicable Regulations</p>
                        <div className="flex flex-wrap gap-1">
                          {inference.regulations.map((reg) => (
                            <Badge key={reg} variant="secondary" className="text-xs">
                              {reg}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Recommendation</p>
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>{inference.recommendation}</AlertDescription>
                        </Alert>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                        <Button size="sm" variant="outline">
                          Flag for Review
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact badge for showing in test result cards
export function InferenceScanBadge({
  scan,
}: {
  scan: InferenceScanResult | null;
}) {
  if (!scan) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Shield className="h-3 w-3 mr-1" />
        Not Scanned
      </Badge>
    );
  }

  if (scan.scanStatus !== "completed") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Scanning...
      </Badge>
    );
  }

  if (scan.actionRequired) {
    return (
      <Badge className="bg-red-500 text-white">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {scan.inferences.length} Risk{scan.inferences.length !== 1 ? "s" : ""}
      </Badge>
    );
  }

  if (scan.inferences.length > 0) {
    return (
      <Badge className="bg-yellow-500 text-black">
        <Info className="h-3 w-3 mr-1" />
        {scan.inferences.length} Inference{scan.inferences.length !== 1 ? "s" : ""}
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-500 text-white">
      <CheckCircle className="h-3 w-3 mr-1" />
      Compliant
    </Badge>
  );
}
