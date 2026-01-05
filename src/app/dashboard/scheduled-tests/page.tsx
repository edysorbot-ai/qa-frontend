"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarClock,
  Clock,
  Calendar,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Loader2,
  Bot,
  RefreshCw,
  CalendarDays,
  Edit,
} from "lucide-react";
import { api } from "@/lib/api";
import { useCallback } from "react";
import { format } from "date-fns";

interface BatchTestCase {
  id: string;
  name: string;
  scenario: string;
  expectedOutcome: string;
  category: string;
}

interface Batch {
  id: string;
  name: string;
  testMode?: string;
  testCases: BatchTestCase[];
}

interface ScheduledTest {
  id: string;
  name: string;
  agent_id: string;
  agent_name: string;
  provider: string;
  batches: Batch[];
  schedule_type: "once" | "daily" | "weekly";
  scheduled_time: string;
  scheduled_date?: string;
  scheduled_days?: number[];
  timezone: string;
  status: "active" | "paused" | "completed";
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
};

const scheduleTypeIcons: Record<string, React.ReactNode> = {
  once: <Calendar className="h-4 w-4" />,
  daily: <RefreshCw className="h-4 w-4" />,
  weekly: <CalendarDays className="h-4 w-4" />,
};

export default function ScheduledTestsPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [scheduledTests, setScheduledTests] = useState<ScheduledTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Edit dialog state
  const [editingTest, setEditingTest] = useState<ScheduledTest | null>(null);
  const [editName, setEditName] = useState("");
  const [editScheduleType, setEditScheduleType] = useState<"once" | "daily" | "weekly">("once");
  const [editScheduleDate, setEditScheduleDate] = useState<Date | undefined>(undefined);
  const [editScheduleTime, setEditScheduleTime] = useState("");
  const [editScheduleDays, setEditScheduleDays] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to get minimum allowed time (30 min from now)
  const getMinTime = (selectedDate?: Date) => {
    const now = new Date();
    const isToday = selectedDate && 
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear();
    
    if (isToday) {
      const minTime = new Date(now.getTime() + 30 * 60 * 1000);
      return `${String(minTime.getHours()).padStart(2, '0')}:${String(minTime.getMinutes()).padStart(2, '0')}`;
    }
    return "00:00";
  };

  // Open edit dialog with test data
  const openEditDialog = (test: ScheduledTest) => {
    setEditingTest(test);
    setEditName(test.name);
    setEditScheduleType(test.schedule_type);
    setEditScheduleTime(test.scheduled_time);
    setEditScheduleDays(test.scheduled_days || []);
    if (test.scheduled_date) {
      setEditScheduleDate(new Date(test.scheduled_date));
    } else {
      setEditScheduleDate(undefined);
    }
  };

  // Toggle day selection for weekly schedule
  const toggleEditScheduleDay = (day: number) => {
    setEditScheduleDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day) 
        : [...prev, day].sort()
    );
  };

  // Save edited schedule
  const handleSaveEdit = async () => {
    if (!editingTest) return;

    // Validation
    if (!editName.trim()) {
      return;
    }
    if (editScheduleType === "once" && !editScheduleDate) {
      return;
    }
    if (editScheduleType === "weekly" && editScheduleDays.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const token = await getToken();
      
      const updateData: Record<string, unknown> = {
        name: editName,
        scheduleType: editScheduleType,
        scheduledTime: editScheduleTime,
      };

      if (editScheduleType === "once" && editScheduleDate) {
        updateData.scheduledDate = format(editScheduleDate, "yyyy-MM-dd");
      }
      if (editScheduleType === "weekly") {
        updateData.scheduledDays = editScheduleDays;
      }

      const response = await fetch(api.endpoints.scheduledTests.update(editingTest.id), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        // Reload the list to get updated data
        await loadScheduledTests();
        setEditingTest(null);
      }
    } catch (error) {
      console.error("Error updating scheduled test:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const loadScheduledTests = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.scheduledTests.list, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setScheduledTests(data.scheduledTests || []);
      }
    } catch (error) {
      console.error("Error loading scheduled tests:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadScheduledTests();
  }, [loadScheduledTests]);

  const handleToggleStatus = async (id: string) => {
    setTogglingId(id);
    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.scheduledTests.toggle(id), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setScheduledTests(
          scheduledTests.map((t) =>
            t.id === id ? { ...t, status: data.status } : t
          )
        );
      }
    } catch (error) {
      console.error("Error toggling scheduled test:", error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const token = await getToken();
      const response = await fetch(
        api.endpoints.scheduledTests.delete(deleteId),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setScheduledTests(scheduledTests.filter((t) => t.id !== deleteId));
      }
    } catch (error) {
      console.error("Error deleting scheduled test:", error);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getScheduleDescription = (test: ScheduledTest) => {
    switch (test.schedule_type) {
      case "once":
        return `Once on ${formatDate(test.scheduled_date!)} at ${formatTime(test.scheduled_time)}`;
      case "daily":
        return `Daily at ${formatTime(test.scheduled_time)}`;
      case "weekly":
        const days = test.scheduled_days
          ?.map((d) => dayNames[d])
          .join(", ");
        return `Every ${days} at ${formatTime(test.scheduled_time)}`;
      default:
        return "";
    }
  };

  const getTotalTestCases = (batches: Batch[]) => {
    return batches.reduce(
      (sum, batch) => sum + (batch.testCases?.length || 0),
      0
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <CalendarClock className="h-8 w-8" />
            Scheduled Tests
          </h1>
          <p className="text-muted-foreground">
            Manage your scheduled test runs
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/test-runs/new")}>
          Create New Test Run
        </Button>
      </div>

      {/* Scheduled Tests List */}
      {scheduledTests.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Scheduled Tests</CardTitle>
            <CardDescription>
              You haven&apos;t scheduled any tests yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Create a new test run and use the &quot;Schedule&quot; option to set up
              recurring or one-time scheduled tests.
            </p>
            <Button onClick={() => router.push("/dashboard/test-runs/new")}>
              Create Test Run
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scheduledTests.map((test) => (
            <Card
              key={test.id}
              className={`${
                test.status === "paused" ? "opacity-70" : ""
              } hover:shadow-md transition-shadow`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <CalendarClock className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{test.name}</h3>
                        <Badge
                          variant="secondary"
                          className={statusColors[test.status]}
                        >
                          {test.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bot className="h-4 w-4" />
                          {test.agent_name}
                        </span>
                        <span className="flex items-center gap-1">
                          {scheduleTypeIcons[test.schedule_type]}
                          {getScheduleDescription(test)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span>
                          {test.batches.length} batch
                          {test.batches.length !== 1 ? "es" : ""} •{" "}
                          {getTotalTestCases(test.batches)} test cases
                        </span>
                        {test.next_run_at && test.status === "active" && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Next run: {formatDateTime(test.next_run_at)}
                          </span>
                        )}
                        {test.last_run_at && (
                          <span className="text-xs">
                            Last run: {formatDateTime(test.last_run_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {test.status !== "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(test.id)}
                        disabled={togglingId === test.id}
                      >
                        {togglingId === test.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : test.status === "active" ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </>
                        )}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(test)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(test.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this scheduled test. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={!!editingTest} onOpenChange={() => setEditingTest(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Schedule
            </DialogTitle>
            <DialogDescription>
              Modify the schedule configuration for this test
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Schedule Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Schedule Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter a name for this scheduled test"
              />
            </div>

            {/* Schedule Type Tabs */}
            <Tabs value={editScheduleType} onValueChange={(v) => setEditScheduleType(v as "once" | "daily" | "weekly")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="once" className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Once
                </TabsTrigger>
                <TabsTrigger value="daily" className="flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4" />
                  Daily
                </TabsTrigger>
                <TabsTrigger value="weekly" className="flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4" />
                  Weekly
                </TabsTrigger>
              </TabsList>

              {/* Once - Date & Time */}
              <TabsContent value="once" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {editScheduleDate ? format(editScheduleDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editScheduleDate}
                        onSelect={(date) => {
                          setEditScheduleDate(date);
                          if (date) {
                            const minTime = getMinTime(date);
                            if (editScheduleTime < minTime) {
                              setEditScheduleTime(minTime);
                            }
                          }
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-time-once">
                    Time {editScheduleDate && getMinTime(editScheduleDate) !== "00:00" && (
                      <span className="text-muted-foreground">(min: {getMinTime(editScheduleDate)})</span>
                    )}
                  </Label>
                  <Input
                    id="edit-time-once"
                    type="time"
                    value={editScheduleTime}
                    min={getMinTime(editScheduleDate)}
                    onChange={(e) => {
                      const minTime = getMinTime(editScheduleDate);
                      if (e.target.value >= minTime) {
                        setEditScheduleTime(e.target.value);
                      } else {
                        setEditScheduleTime(minTime);
                      }
                    }}
                  />
                </div>
              </TabsContent>

              {/* Daily - Time only */}
              <TabsContent value="daily" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-time-daily">Run daily at</Label>
                  <Input
                    id="edit-time-daily"
                    type="time"
                    value={editScheduleTime}
                    onChange={(e) => setEditScheduleTime(e.target.value)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  This test will run every day at the specified time in your local timezone.
                </p>
              </TabsContent>

              {/* Weekly - Days & Time */}
              <TabsContent value="weekly" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Select Days</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                      <div
                        key={day}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer transition-colors ${
                          editScheduleDays.includes(index)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => toggleEditScheduleDay(index)}
                      >
                        <span className="text-xs font-medium">{day}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-time-weekly">Time</Label>
                  <Input
                    id="edit-time-weekly"
                    type="time"
                    value={editScheduleTime}
                    onChange={(e) => setEditScheduleTime(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Summary */}
            <div className="bg-muted rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Summary</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Agent:</strong> {editingTest?.agent_name}</p>
                <p><strong>Batches:</strong> {editingTest?.batches.length}</p>
                <p><strong>Test Cases:</strong> {editingTest ? getTotalTestCases(editingTest.batches) : 0}</p>
                <p>
                  <strong>Schedule:</strong>{" "}
                  {editScheduleType === "once" && editScheduleDate
                    ? `Once on ${format(editScheduleDate, "PPP")} at ${editScheduleTime}`
                    : editScheduleType === "daily"
                    ? `Daily at ${editScheduleTime}`
                    : editScheduleType === "weekly" && editScheduleDays.length > 0
                    ? `Every ${editScheduleDays.map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")} at ${editScheduleTime}`
                    : "Not configured"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditingTest(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Edit className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
