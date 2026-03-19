"use client";

import { useRef, useState } from "react";

import type { SocialLeadRecord } from "@/types/studio";

interface MissingFieldsModalProps {
  lead: SocialLeadRecord;
  action: (formData: FormData) => Promise<void>;
}

export function MissingFieldsModal({ lead, action }: MissingFieldsModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Determine which fields are actually missing
  const getMissingFields = (): { field: string; label: string }[] => {
    const hasValue = (value: string | null) => Boolean(value && value.trim().length > 0);
    const missing = [];
    if (!hasValue(lead.email)) missing.push({ field: "email", label: "Email" });
    if (!hasValue(lead.phone)) missing.push({ field: "phone", label: "Phone" });
    if (!hasValue(lead.placement)) missing.push({ field: "placement", label: "Placement" });
    if (!hasValue(lead.style)) missing.push({ field: "style", label: "Tattoo style" });
    if (!hasValue(lead.budgetRange)) missing.push({ field: "budgetRange", label: "Budget range" });
    return missing;
  };

  const actualMissing = getMissingFields();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFields.length === 0) {
      alert("Please select at least one field to request.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("socialLeadId", lead.id);
    formData.append("fieldsNeeded", JSON.stringify(selectedFields));
    formData.append("message", message);

    try {
      await action(formData);
      dialogRef.current?.close();
      setSelectedFields([]);
      setMessage("");
    } catch (err) {
      console.error("Failed to request fields:", err);
      alert("Failed to send field request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  return (
    <>
      <button
        onClick={() => {
          dialogRef.current?.showModal();
        }}
        className="rounded-full bg-[var(--brass)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-[var(--brass)]/90"
      >
        Request missing info
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-[32px] border border-[var(--ink)]/10 bg-[var(--canvas)] p-0 backdrop:bg-black/40"
      >
        <form onSubmit={handleSubmit} className="space-y-6 p-8">
          <div>
            <h2 className="font-display text-2xl uppercase tracking-[0.08em] text-[var(--ink)]">
              Request missing info
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Send {lead.clientName ?? "this client"} a message asking for the details you need to convert this lead.
            </p>
          </div>

          <div className="space-y-3 border-t border-[var(--ink)]/8 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Which fields do you need?
            </p>
            <div className="space-y-2">
              {actualMissing.map((field) => (
                <label key={field.field} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.field)}
                    onChange={() => toggleField(field.field)}
                    className="h-4 w-4 rounded border border-[var(--ink)]/20 accent-[var(--brass)]"
                  />
                  <span className="text-sm text-[var(--ink)]">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Optional message
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="E.g., 'We need your phone number to confirm the appointment time.'"
                rows={3}
                className="mt-2 w-full rounded-[20px] border border-[var(--ink)]/10 bg-white/70 px-4 py-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--brass)] focus:bg-white"
              />
            </label>
          </div>

          <div className="flex gap-3 border-t border-[var(--ink)]/8 pt-6">
            <button
              type="button"
              onClick={() => {
                dialogRef.current?.close();
              }}
              className="flex-1 rounded-full border border-[var(--ink)]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-[var(--ink)]/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedFields.length === 0}
              className="flex-1 rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending..." : "Send request"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
