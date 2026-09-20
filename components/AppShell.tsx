"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BottomNav } from "@/components/BottomNav";
import { EntrySheet } from "@/components/EntrySheet";
import { MemberSheet } from "@/components/MemberSheet";
import { ToastProvider } from "@/components/Toast";

export type PickerMember = {
  id: string;
  name: string;
  photoUrl: string | null;
};

type SheetApi = {
  /** Open the deposit / withdrawal sheet. */
  open: (memberId?: string) => void;
  /** Open the new-member sheet. */
  openMemberForm: () => void;
  /** Whether this visitor may edit. Viewers get a read-only app. */
  isAdmin: boolean;
};

const AddSheetContext = createContext<SheetApi | null>(null);

export function useAddSheet() {
  const ctx = useContext(AddSheetContext);
  if (!ctx) throw new Error("useAddSheet must be used inside <AppShell>");
  return ctx;
}

export function AppShell({
  members,
  isAdmin,
  children,
}: {
  members: PickerMember[];
  isAdmin: boolean;
  children: ReactNode;
}) {
  const [entryOpen, setEntryOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [preselected, setPreselected] = useState<string | undefined>();

  const open = useCallback((memberId?: string) => {
    setPreselected(memberId);
    setEntryOpen(true);
  }, []);

  const openMemberForm = useCallback(() => {
    setEntryOpen(false);
    setMemberOpen(true);
  }, []);

  const api = useMemo<SheetApi>(
    () => ({ open, openMemberForm, isAdmin }),
    [open, openMemberForm, isAdmin],
  );

  return (
    <ToastProvider>
      <AddSheetContext.Provider value={api}>
        {/* The phone frame: full-bleed on mobile, a centred device on desktop. */}
        <div className="relative mx-auto flex min-h-dvh w-full max-w-[34rem] flex-col">
          <main className="flex-1 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-40">
            {children}
          </main>
        </div>

        <BottomNav />

        {/* The write sheets exist only for the admin. */}
        {isAdmin && (
          <>
            <EntrySheet
              open={entryOpen}
              onClose={() => setEntryOpen(false)}
              members={members}
              preselectedId={preselected}
              onAddMember={openMemberForm}
            />

            <MemberSheet
              open={memberOpen}
              onClose={() => setMemberOpen(false)}
            />
          </>
        )}
      </AddSheetContext.Provider>
    </ToastProvider>
  );
}
