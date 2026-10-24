"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  LockKeyhole,
  RefreshCw,
  LayoutDashboard,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
type Board = {
  state: string;
  name?: string;
  tasks?: {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
  }[];
};
const statuses = ["backlog", "todo", "in_progress", "in_review", "done"];
const labels: Record<string, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Completed",
};
export function PublicBoard({ token }: { token: string }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [password, setPassword] = useState("");
  const [unlockedPassword, setUnlockedPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(
    async (secret: string | null) => {
      setBusy(true);
      setError("");
      try {
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            token,
          )
        ) {
          setBoard({ state: "unavailable" });
          return;
        }
        if (!supabase) throw new Error();
        const { data, error } = await supabase.rpc(
          "read_shared_project_board",
          { share_token: token, share_password: secret },
        );
        if (error) throw error;
        setBoard(data || { state: "unavailable" });
        if (data?.state === "ready") {
          setUnlockedPassword(secret);
          setPassword("");
        } else setUnlockedPassword(null);
      } catch {
        setBoard(null);
        setError(
          "Unable to load the board. Please try again or contact the project owner.",
        );
      } finally {
        setBusy(false);
      }
    },
    [token],
  );
  useEffect(() => {
    void load(null);
  }, [load]);
  async function unlock(e: FormEvent) {
    e.preventDefault();
    await load(password);
  }
  const tasks = board?.tasks || [];
  const ordered = [
    ...statuses,
    ...Array.from(new Set(tasks.map((t) => t.status))).filter(
      (s) => !statuses.includes(s),
    ),
  ];
  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-900 px-4 py-8 md:px-10 md:py-12">
      <div className="max-w-[1500px] mx-auto">
        <div className="flex gap-2 items-center text-sm text-slate-500 mb-10">
          <LayoutDashboard size={18} /> VinzFlow{" "}
          <span className="mx-2 text-slate-300">/</span> Client project board
        </div>
        {board?.state === "ready" ? (
          <>
            <header className="flex flex-wrap gap-6 items-center justify-between mb-8">
              <div>
                <p className="uppercase tracking-widest text-xs text-indigo-600 font-semibold mb-2">
                  Project progress
                </p>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {board.name}
                </h1>
                <p className="text-sm text-slate-500 mt-3">
                  {tasks.length} tasks ·{" "}
                  {tasks.filter((t) => t.status === "done").length} completed ·
                  Read-only access
                </p>
              </div>
              <button
                disabled={busy}
                onClick={() => void load(unlockedPassword)}
                className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-2.5 text-sm flex items-center gap-2"
              >
                <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
                Refresh progress
              </button>
            </header>
            <div className="overflow-x-auto pb-6">
              <div className="flex gap-5 min-w-max">
                {ordered.map((status) => {
                  const items = tasks.filter((t) => t.status === status);
                  return (
                    <section
                      key={status}
                      className="w-72 rounded-2xl bg-slate-100/80 border border-slate-200/70 p-3"
                    >
                      <h2 className="flex justify-between items-center px-1 py-2 mb-3 text-sm font-semibold">
                        <span className="capitalize">
                          {labels[status] || status.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-md bg-white px-2 py-0.5 text-xs text-slate-500">
                          {items.length}
                        </span>
                      </h2>
                      <div className="space-y-3">
                        {items.map((task) => (
                          <article
                            key={task.id}
                            className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm"
                          >
                            <h3 className="font-medium text-sm leading-relaxed break-words">
                              {task.title}
                            </h3>
                            {task.due_date && (
                              <p className="text-xs text-slate-500 mt-4 flex items-center gap-1.5">
                                <CalendarDays size={13} />
                                Due{" "}
                                {new Date(
                                  task.due_date.slice(0, 10) + "T12:00:00",
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            )}
                          </article>
                        ))}
                        {!items.length && (
                          <p className="border border-dashed border-slate-300 rounded-xl px-4 py-8 text-center text-sm text-slate-400">
                            No tasks here yet
                          </p>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-md mx-auto mt-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <LockKeyhole className="text-indigo-600 mb-5" size={28} />
            <h1 className="text-xl font-semibold mb-3">
              {busy
                ? "Loading project…"
                : board?.state === "unavailable"
                  ? "This link is unavailable"
                  : "Private project board"}
            </h1>
            {board?.state === "unavailable" ? (
              <p className="text-sm text-slate-500">
                The link may have been replaced or disabled. Ask the project
                owner for a new link.
              </p>
            ) : (
              !busy &&
              board && (
                <form onSubmit={unlock} className="space-y-4">
                  <p className="text-sm text-slate-500">
                    Enter the password provided by your project team.
                  </p>
                  <label className="block text-sm">
                    Board password
                    <input
                      autoFocus
                      required
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-3 mt-2"
                    />
                  </label>
                  {board.state === "incorrect" && (
                    <p role="alert" className="text-sm text-red-600">
                      Incorrect password. Please try again.
                    </p>
                  )}
                  {board.state === "limited" && (
                    <p role="alert" className="text-sm text-red-600">
                      Too many attempts. Please wait one minute before trying
                      again.
                    </p>
                  )}
                  <button
                    disabled={busy}
                    className="w-full bg-indigo-600 text-white rounded-lg p-3 text-sm font-medium"
                  >
                    View project board
                  </button>
                </form>
              )
            )}
            {error && (
              <div role="alert" className="text-sm text-red-600 space-y-4">
                <p>{error}</p>
                <button className="underline" onClick={() => void load(null)}>
                  Try again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
