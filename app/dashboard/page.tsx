"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Navbar from "@/components/Navbar";
import PrivateRoute from "@/components/PrivateRoute";
import API from "@/lib/axios";

type Project = {
  _id: string;
  projectName: string;
  description: string;
  createdAt: string;
  taskStats: { total: number; completed: number };
};

const CARD_GRADIENTS = [
  "from-indigo-500 to-indigo-700",
  "from-violet-500 to-violet-700",
  "from-sky-500 to-sky-700",
  "from-emerald-500 to-emerald-700",
  "from-rose-500 to-rose-700",
  "from-amber-500 to-amber-700",
  "from-pink-500 to-pink-700",
  "from-teal-500 to-teal-700",
];

function gradientForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  }
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({ projectName: "", description: "" });
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const res = await API.get("/projects");
      setProjects(res.data.projects ?? []);
    } catch {
      // silently fail — user will see empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setCreating(true);
    try {
      await API.post("/projects", form);
      setForm({ projectName: "", description: "" });
      setShowForm(false);
      fetchProjects();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFormError(err.response?.data?.message ?? "Failed to create project.");
      } else {
        setFormError("Something went wrong.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await API.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch {
      // keep project in list if delete fails
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PrivateRoute>
      <div className="min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-900">
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="mb-8 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Projects</h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {loading ? "Loading…" : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              onClick={() => { setShowForm(true); setFormError(""); }}
              className="btn-primary flex items-center gap-1.5"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              New project
            </button>
          </div>

          {/* Create project modal */}
          {showForm && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">New project</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleCreate} className="space-y-4 p-6">
                  {formError && (
                    <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{formError}</p>
                  )}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Project name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.projectName}
                      onChange={(e) => setForm((p) => ({ ...p, projectName: e.target.value }))}
                      placeholder="e.g. Website Redesign"
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
                      placeholder="What is this project about?"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                    />
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
                      disabled={creating}
                      className="btn-primary flex-1"
                    >
                      {creating ? "Creating…" : "Create project"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {!loading && projects.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">Your active workspace</p>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                {projects.length} total
              </span>
            </div>
          )}

          {/* Project grid */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30">
                <svg className="h-7 w-7 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">No projects yet</h3>
              <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">Create your first project to get started</p>
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary"
              >
                Create a project
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const pct = project.taskStats.total > 0
                  ? Math.round((project.taskStats.completed / project.taskStats.total) * 100)
                  : 0;
                return (
                  <div
                    key={project._id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                  >
                    {/* Color strip */}
                    <div className={`h-1.5 w-full bg-linear-to-r ${gradientForId(project._id)}`} />

                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="font-semibold leading-snug text-slate-900 line-clamp-1 dark:text-white">
                          {project.projectName}
                        </h3>
                        <button
                          onClick={() => handleDelete(project._id)}
                          disabled={deletingId === project._id}
                          title="Delete project"
                          className="mt-0.5 shrink-0 rounded-lg p-1 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:cursor-not-allowed dark:text-slate-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        >
                          {deletingId === project._id ? (
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

                      <p className="mb-3 flex-1 text-sm leading-relaxed text-slate-500 line-clamp-2 dark:text-slate-400">
                        {project.description || "No description"}
                      </p>

                      {/* Task completion progress bar */}
                      {project.taskStats.total > 0 && (
                        <div className="mb-3">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {project.taskStats.completed}/{project.taskStats.total} tasks
                            </span>
                            <span className={`text-xs font-semibold ${pct === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {formatDate(project.createdAt)}
                        </span>
                        <button
                          onClick={() => router.push(`/projects/${project._id}/tasks`)}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
                        >
                          View tasks
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </PrivateRoute>
  );
}
