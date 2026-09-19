"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createMember, updateMember } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { CameraIcon, CloseIcon } from "@/components/Icons";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";

type EditTarget = { id: string; name: string; photoUrl: string | null };

type MemberSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Omit to create a new member; pass one to edit it. */
  member?: EditTarget;
};

export function MemberSheet(props: MemberSheetProps) {
  // Remounting the body on each open gives a clean form without reset effects.
  const generation = props.open ? (props.member?.id ?? "new") : "closed";

  return (
    <Sheet
      open={props.open}
      onClose={props.onClose}
      title={props.member ? "Edit member" : "New member"}
    >
      <MemberForm key={generation} {...props} />
    </Sheet>
  );
}

function MemberForm({ onClose, member }: MemberSheetProps) {
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(member?.name ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A blob URL for the freshly picked file; released when it is replaced.
  const localUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  const preview = localUrl ?? (removePhoto ? null : (member?.photoUrl ?? null));
  const canSubmit = name.trim().length > 0 && !pending;

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError("Name is required.");

    const data = new FormData();
    data.set("name", trimmed);
    if (file) data.set("photo", file);
    if (member) {
      data.set("id", member.id);
      if (removePhoto && !file) data.set("removePhoto", "1");
    }

    startTransition(async () => {
      const result = member
        ? await updateMember(data)
        : await createMember(data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      notify(member ? "Member updated" : `${trimmed} added`);
      onClose();
    });
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col items-center gap-3 pt-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => fileInput.current?.click()}
          className="relative"
          aria-label="Choose a photo"
        >
          {preview ? (
            <span className="relative block size-24 overflow-hidden rounded-full ring-2 ring-white/80 shadow-[0_10px_24px_-10px_rgba(18,60,53,0.6)]">
              {/* A plain img: the preview can be a blob: URL, which the
                  image optimizer cannot fetch. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="size-full object-cover" />
            </span>
          ) : (
            <Avatar name={name || "?"} size="xl" />
          )}

          <span className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full bg-gradient-to-br from-turquoise to-cobalt text-white shadow-[0_8px_18px_-8px_rgba(41,153,104,0.9)] ring-2 ring-white">
            <CameraIcon className="size-4.5" />
          </span>
        </motion.button>

        {preview && (
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setRemovePhoto(true);
              if (fileInput.current) fileInput.current.value = "";
            }}
            className="flex items-center gap-1 text-xs font-bold text-ink-faint"
          >
            <CloseIcon className="size-3.5" />
            Remove photo
          </button>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(e) => {
            const chosen = e.target.files?.[0] ?? null;
            if (chosen) {
              setFile(chosen);
              setRemovePhoto(false);
              setError(null);
            }
          }}
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold tracking-wide text-ink-faint uppercase">
          Name
        </span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="e.g. Anjali Rao"
          maxLength={60}
          autoComplete="off"
          className="rounded-2xl bg-white/70 px-4 py-3.5 text-base font-semibold text-ink ring-1 ring-white/80 outline-none placeholder:font-medium placeholder:text-ink-faint/70 focus:ring-turquoise"
        />
      </label>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm font-semibold text-down"
        >
          {error}
        </motion.p>
      )}

      <motion.button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        whileTap={canSubmit ? { scale: 0.97 } : undefined}
        className={`w-full rounded-2xl bg-gradient-to-br from-turquoise to-cobalt py-4 text-base font-bold text-white ${
          canSubmit
            ? "shadow-[0_14px_30px_-12px_rgba(41,153,104,0.9)]"
            : "opacity-45"
        }`}
      >
        {pending ? "Saving…" : member ? "Save changes" : "Add member"}
      </motion.button>
    </div>
  );
}
