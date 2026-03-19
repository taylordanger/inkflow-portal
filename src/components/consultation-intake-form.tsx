"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createConsultationAction } from "@/app/consultations/actions";
import type { ConsultationFormState } from "@/types/studio";

const initialConsultationFormState: ConsultationFormState = {
  status: "idle",
  message: "Capture a serious lead and route it into the consult queue.",
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-2 text-sm text-[var(--ember)]">{errors[0]}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving intake..." : "Create consult intake"}
    </button>
  );
}

const inputClassName =
  "mt-2 w-full rounded-[20px] border border-[var(--ink)]/10 bg-white/70 px-4 py-3 text-base text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--brass)] focus:bg-white";

export function ConsultationIntakeForm() {
  const [state, action] = useActionState(
    createConsultationAction,
    initialConsultationFormState,
  );

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Client name
          <input
            name="clientName"
            className={inputClassName}
            placeholder="Sage Navarro"
            defaultValue={state.values?.clientName ?? ""}
          />
          <FieldError errors={state.fieldErrors?.clientName} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Email
          <input
            name="email"
            type="email"
            className={inputClassName}
            placeholder="sage@example.com"
            defaultValue={state.values?.email ?? ""}
          />
          <FieldError errors={state.fieldErrors?.email} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Phone
          <input
            name="phone"
            className={inputClassName}
            placeholder="503-555-0123"
            defaultValue={state.values?.phone ?? ""}
          />
          <FieldError errors={state.fieldErrors?.phone} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Placement
          <input
            name="placement"
            className={inputClassName}
            placeholder="Outer forearm"
            defaultValue={state.values?.placement ?? ""}
          />
          <FieldError errors={state.fieldErrors?.placement} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Style
          <input
            name="style"
            className={inputClassName}
            placeholder="Fine line floral"
            defaultValue={state.values?.style ?? ""}
          />
          <FieldError errors={state.fieldErrors?.style} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Requested timing
          <input
            name="requestedWindow"
            className={inputClassName}
            placeholder="Weekday afternoons in April"
            defaultValue={state.values?.requestedWindow ?? ""}
          />
          <FieldError errors={state.fieldErrors?.requestedWindow} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Budget range
          <select
            name="budgetRange"
            className={inputClassName}
            defaultValue={state.values?.budgetRange ?? "$300-$600"}
          >
            <option value="$150-$300">$150-$300</option>
            <option value="$300-$600">$300-$600</option>
            <option value="$600-$1,000">$600-$1,000</option>
            <option value="$1,000+">$1,000+</option>
          </select>
          <FieldError errors={state.fieldErrors?.budgetRange} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Preferred artist
          <select
            name="preferredArtist"
            className={inputClassName}
            defaultValue={state.values?.preferredArtist ?? "First available"}
          >
            <option value="First available">First available</option>
            <option value="Kai">Kai</option>
            <option value="Mara">Mara</option>
            <option value="Sol">Sol</option>
          </select>
          <FieldError errors={state.fieldErrors?.preferredArtist} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Lead source
          <select
            name="leadSource"
            className={inputClassName}
            defaultValue={state.values?.leadSource ?? "Website"}
          >
            <option value="Website">Website</option>
            <option value="Instagram">Instagram</option>
            <option value="TikTok">TikTok</option>
            <option value="Referral">Referral</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Returning client">Returning client</option>
          </select>
          <FieldError errors={state.fieldErrors?.leadSource} />
        </label>
      </div>

      <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Tattoo idea
        <textarea
          name="ideaSummary"
          rows={4}
          className={`${inputClassName} resize-none`}
          placeholder="Describe the concept, scale, mood, and whether it connects to an existing piece."
          defaultValue={state.values?.ideaSummary ?? ""}
        />
        <FieldError errors={state.fieldErrors?.ideaSummary} />
      </label>

      <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        References and direction
        <textarea
          name="referenceSummary"
          rows={3}
          className={`${inputClassName} resize-none`}
          placeholder="Summarize reference images, must-keep details, and any design constraints."
          defaultValue={state.values?.referenceSummary ?? ""}
        />
        <FieldError errors={state.fieldErrors?.referenceSummary} />
      </label>

      <div className="flex flex-col gap-4 border-t border-[var(--ink)]/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className={`text-sm ${
              state.status === "error"
                ? "text-[var(--ember)]"
                : state.status === "success"
                  ? "text-[var(--teal)]"
                  : "text-[var(--muted)]"
            }`}
          >
            {state.message}
          </p>
        </div>
        <SubmitButton />
      </div>
    </form>
  );
}