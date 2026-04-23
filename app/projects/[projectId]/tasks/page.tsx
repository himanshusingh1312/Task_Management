"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Navbar from "@/components/Navbar";
import PrivateRoute from "@/components/PrivateRoute";
import API from "@/lib/axios";

type Task = {
  _id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in-progress" | "completed";
  dueDate: string;
};

type Pagination = {
  page: number;
  totalPages: number;
  total: number;
};

type Stats = {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  overdue: number;
};

const PRIORITY_STYLES = {
  high: "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900",
  medium: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900",
  low: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900",
};

const STATUS_STYLES = {
  "todo": "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  "in-progress": "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "completed": "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const STATUS_LABELS = {
  "todo": "To do",
  "in-progress": "In progress",
  "completed": "Completed",
};

function formatDueDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPast = d < today;
  const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${isPast ? "⚠ " : ""}${formatted}`;
}

function isDueDatePast(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export default function ProjectTasksPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState<Stats>({ total: 0, todo: 0, inProgress: 0, completed: 0, overdue: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    dueDate: "",
  });

  // Debounce search input by 300 ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: String(page), limit: "10" });
      if (statusFilter) query.append("status", statusFilter);
      if (debouncedSearch) query.append("search", debouncedSearch);
      const res = await API.get(`/projects/${projectId}/tasks?${query}`);
      setTasks(res.data.tasks ?? []);
      setPagination(res.data.pagination ?? { page: 1, totalPages: 1, total: 0 });
      if (res.data.stats) setStats(res.data.stats);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, debouncedSearch]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await API.post(`/projects/${projectId}/tasks`, form);
      setForm({ title: "", description: "", priority: "medium", dueDate: "" });
      setShowForm(false);
      fetchTasks();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFormError(err.response?.data?.message ?? "Failed to add task.");
      } else {
        setFormError("Something went wrong.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: Task["status"]) => {
    setUpdatingId(taskId);
    try {
      await API.put(`/projects/${projectId}/tasks/${taskId}`, { status });
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status } : t))
      );
      // Refresh stats after status change
      fetchTasks();
    } catch {
      // revert handled by not changing state on error
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    setDeletingId(taskId);
    try {
      await API.delete(`/projects/${projectId}/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      fetchTasks();
    } catch {
      //
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PrivateRoute>
      <div className="min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-900">
        <Navbar overdueCount={stats.overdue} />

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Back + header */}
          <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Back to projects
            </button>

            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tasks</h1>
              <button
                onClick={() => { setShowForm(true); setFormError(""); }}
                className="btn-primary flex items-center gap-1.5"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add task
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Total", value: stats.total, color: "text-slate-900 dark:text-white" },
              { label: "To do", value: stats.todo, color: "text-slate-600 dark:text-slate-300" },
              { label: "In progress", value: stats.inProgress, color: "text-blue-700 dark:text-blue-400" },
              { label: "Completed", value: stats.completed, color: "text-emerald-700 dark:text-emerald-400" },
              { label: "Overdue", value: stats.overdue, color: stats.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 ${
                  label === "Overdue" && value > 0
                    ? "border-red-100 dark:border-red-900/50"
                    : "border-slate-100 dark:border-slate-700"
                }`}
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Search + Filter row */}
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-800/80">
            {/* Search */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by title or description…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-500"
              />
              {searchTerm && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Filter:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "", label: "All" },
                  { value: "todo", label: "To do" },
                  { value: "in-progress", label: "In progress" },
                  { value: "completed", label: "Completed" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => { setStatusFilter(value); setPage(1); }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      statusFilter === value
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Add task modal */}
          {showForm && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Add task</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAddTask} className="space-y-4 p-6">
                  {formError && (
                    <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{formError}</p>
                  )}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="What needs to be done?"
                      className="auth-input"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Add details (optional)"
                      rows={2}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
                      <select
                        value={form.priority}
                        onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as Task["priority"] }))}
                        className="auth-input"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Due date</label>
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary flex-1"
                    >
                      {submitting ? "Adding…" : "Add task"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Task list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30">
                <svg className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">
                {statusFilter || debouncedSearch ? "No tasks match" : "No tasks yet"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {statusFilter || debouncedSearch ? "Try a different filter or search term" : "Add your first task to get started"}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div
                  key={task._id}
                  className={`group flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-start sm:justify-between dark:bg-slate-800 ${
                    task.status === "completed"
                      ? "border-emerald-100 opacity-80 dark:border-emerald-900/50"
                      : isDueDatePast(task.dueDate)
                      ? "border-red-100 dark:border-red-900/40"
                      : "border-slate-100 dark:border-slate-700"
                  }`}
                >
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex items-start gap-2.5">
                      {/* Status dot */}
                      <div
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          task.status === "completed"
                            ? "bg-emerald-500"
                            : task.status === "in-progress"
                            ? "bg-blue-500"
                            : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      />
                      <div className="flex-1">
                        <h4
                          className={`text-sm font-semibold leading-snug ${
                            task.status === "completed"
                              ? "text-slate-400 line-through dark:text-slate-500"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 line-clamp-2 dark:text-slate-400">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-4">
                      {/* Priority badge */}
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[task.priority]}`}
                      >
                        {task.priority}
                      </span>

                      {/* Due date */}
                      {task.dueDate && (
                        <span
                          className={`text-xs ${
                            isDueDatePast(task.dueDate) && task.status !== "completed"
                              ? "font-medium text-red-500 dark:text-red-400"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {formatDueDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="relative">
                      {updatingId === task._id && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <svg className="h-3 w-3 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      )}
                      <select
                        value={task.status}
                        onChange={(e) =>
                          handleStatusChange(task._id, e.target.value as Task["status"])
                        }
                        disabled={updatingId === task._id}
                        className={`appearance-none rounded-lg border px-2.5 py-1.5 pr-6 text-xs font-medium outline-none transition disabled:opacity-60 ${STATUS_STYLES[task.status]}`}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 6px center",
                        }}
                      >
                        <option value="todo">{STATUS_LABELS["todo"]}</option>
                        <option value="in-progress">{STATUS_LABELS["in-progress"]}</option>
                        <option value="completed">{STATUS_LABELS["completed"]}</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleDelete(task._id)}
                      disabled={deletingId === task._id}
                      title="Delete task"
                      className="rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:cursor-not-allowed dark:text-slate-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                    >
                      {deletingId === task._id ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </main>
      </div>
    </PrivateRoute>
  );
}
