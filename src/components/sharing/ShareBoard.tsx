"use client";
import { useEffect, useState, useRef } from "react";
import { Share2, X, LockKeyhole, Globe, Copy, Loader2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { supabase } from "@/lib/supabase";

type Share = { enabled: boolean; token: string | null; protected: boolean };
export function ShareBoard({ projectId }: { projectId?: string }) {
  const { projects, canManageRoles, activeWorkspaceId } = useStore();
  const [open, setOpen] = useState(false);
  return canManageRoles ? (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs rounded-lg border border-border bg-background px-3 py-1.5 shadow-sm hover:bg-secondary"
      >
        <Share2 size={14} /> Share with client
      </button>
      {open && (
        <ShareDialog
          key={activeWorkspaceId}
          projects={projects}
          initialId={projectId}
          close={() => setOpen(false)}
        />
      )}
    </>
  ) : null;
}
function ShareDialog({
  projects,
  initialId,
  close,
}: {
  projects: { id: string; name: string }[];
  initialId?: string;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const [id, setId] = useState(initialId || "");
  const [share, setShare] = useState<Share | null>(null);
  const [mode, setMode] = useState("password");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setShare(null);
    setError("");
    setPassword("");
    setCopied(false);
    if (!id) return;
    setLoading(true);
    const load = async () => {
      try {
        if (!supabase) throw new Error("Connect Supabase to share a board.");
        const { data, error } = await supabase.rpc(
          "manage_project_board_share",
          { target_project: id },
        );
        if (error) throw error;
        if (!cancelled) {
          setShare(data);
          setMode(data.protected ? "password" : "public");
        }
      } catch {
        if (!cancelled)
          setError(
            "Sharing could not load. Run project_board_sharing.sql in Supabase, then reopen this window.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);
  async function save(operation: string) {
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      if (!supabase) throw new Error("Database unavailable");
      const { data, error } = await supabase.rpc("manage_project_board_share", {
        target_project: id,
        operation,
        share_password: operation === "password" ? password : null,
      });
      if (error) throw error;
      setShare(data);
      setPassword("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : (e as { message?: string }).message || "Unable to update sharing.",
      );
    } finally {
      setBusy(false);
    }
  }
  const url =
    share?.enabled && share.token
      ? `${window.location.origin}/share/board/${share.token}`
      : "";
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-lg bg-transparent text-foreground p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      aria-labelledby="share-board-title"
    >
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 id="share-board-title" className="font-semibold text-lg">
              Share a project board
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              A clear, read-only view for your client.
            </p>
          </div>
          <button onClick={close} disabled={busy} aria-label="Close sharing">
            <X size={20} />
          </button>
        </div>
        <label className="block text-sm">
          Project
          <select
            autoFocus
            value={id}
            disabled={busy}
            onChange={(e) => setId(e.target.value)}
            className="mt-2 w-full bg-background border border-border rounded-lg p-3"
          >
            <option value="">Select a project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Shares all task titles, statuses and due dates in this project.
          Comments, files, descriptions, billing and team details remain
          private.
        </p>
        {loading ? (
          <p className="text-sm flex gap-2">
            <Loader2 size={16} className="animate-spin" />
            Loading sharing settings…
          </p>
        ) : (
          id &&
          share && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "password", name: "With password", Icon: LockKeyhole },
                  { key: "public", name: "Anyone with link", Icon: Globe },
                ].map(({ key, name, Icon }) => (
                  <button
                    key={key}
                    disabled={busy}
                    aria-pressed={mode === key}
                    onClick={() => setMode(key)}
                    className={`border rounded-xl p-3 text-sm text-left flex gap-2 items-center ${mode === key ? "border-primary bg-primary/10" : "border-border"}`}
                  >
                    <Icon size={17} />
                    {name}
                  </button>
                ))}
              </div>
              {mode === "password" && (
                <label className="block text-sm">
                  {share.enabled ? "Set a new password" : "Set a password"}
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 12 characters"
                    className="w-full mt-2 border border-border rounded-lg p-3 bg-background"
                  />
                  <span className="text-xs text-muted-foreground">
                    Share this password with your client separately.
                  </span>
                </label>
              )}
              <button
                disabled={busy || (mode === "password" && password.length < 12)}
                onClick={() => void save(mode)}
                className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy
                  ? "Saving…"
                  : share.enabled
                    ? "Update link & access"
                    : "Create share link"}
              </button>
              {url && (
                <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
                  <p className="text-sm font-medium">
                    {share.protected ? "Password protected" : "Public link"} ·
                    Sharing is on
                  </p>
                  <input
                    aria-label="Share link"
                    readOnly
                    value={url}
                    className="w-full p-2 rounded-lg bg-background border border-border text-xs"
                    onFocus={(e) => e.target.select()}
                  />
                  <div className="flex gap-4 text-sm">
                    <button
                      className="flex items-center gap-1 text-primary"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(url);
                          setCopied(true);
                        } catch {
                          setError(
                            "Select the link above and copy it manually.",
                          );
                        }
                      }}
                    >
                      <Copy size={14} />
                      {copied ? "Copied" : "Copy link"}
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary"
                    >
                      Preview
                    </a>
                    <button
                      disabled={busy}
                      onClick={() => void save("disable")}
                      className="text-red-500 ml-auto"
                    >
                      Disable link
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Updating access replaces the link. Previous links stop
                    working.
                  </p>
                </div>
              )}
            </>
          )
        )}
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    </dialog>
  );
}
