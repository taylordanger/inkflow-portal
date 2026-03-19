"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { createPublicSocialLeadAction } from "@/app/consult/actions";
import { storeReferenceImage } from "@/lib/file-upload";
import type { PublicIntakeFormState, PublicIntakePageData, ReferenceImage } from "@/types/studio";

const initialState: PublicIntakeFormState = {
  status: "idle",
  message: "Tell the studio about your idea and the team will route it into the intake queue.",
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
      {pending ? "Submitting..." : "Send tattoo request"}
    </button>
  );
}

const inputClassName =
  "mt-2 w-full rounded-[20px] border border-[var(--ink)]/10 bg-white/70 px-4 py-3 text-base text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--brass)] focus:bg-white";

export function PublicIntakeForm({ pageData }: { pageData: PublicIntakePageData }) {
  const [state, action] = useActionState(createPublicSocialLeadAction, initialState);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    setUploading(true);
    const newImages: ReferenceImage[] = [];

    try {
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const image = await storeReferenceImage(file);
        newImages.push(image);
      }

      const updated = [...referenceImages, ...newImages];
      setReferenceImages(updated);

      // Store in hidden input for form submission
      if (imagesInputRef.current) {
        imagesInputRef.current.value = JSON.stringify(updated);
      }

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const updated = referenceImages.filter((_, i) => i !== index);
    setReferenceImages(updated);
    if (imagesInputRef.current) {
      imagesInputRef.current.value = JSON.stringify(updated);
    }
  };

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="studioSlug" value={pageData.studioSlug} />
      <input type="hidden" name="socialPlatform" value={pageData.socialPlatform} />
      <input type="hidden" name="socialAccountId" value={pageData.socialAccountId ?? ""} />
      <input type="hidden" name="artistProfileId" value={pageData.artistProfileId ?? ""} />
      <input type="hidden" name="campaignLinkId" value={pageData.campaignLinkId ?? ""} />
      <input type="hidden" name="referenceImages" ref={imagesInputRef} value={JSON.stringify(referenceImages)} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Name
          <input name="clientName" className={inputClassName} placeholder="Sage Navarro" defaultValue={state.values?.clientName ?? ""} />
          <FieldError errors={state.fieldErrors?.clientName} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Email
          <input name="email" type="email" className={inputClassName} placeholder="sage@example.com" defaultValue={state.values?.email ?? ""} />
          <FieldError errors={state.fieldErrors?.email} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Phone
          <input name="phone" className={inputClassName} placeholder="503-555-0123" defaultValue={state.values?.phone ?? ""} />
          <FieldError errors={state.fieldErrors?.phone} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Placement
          <input name="placement" className={inputClassName} placeholder="Outer forearm" defaultValue={state.values?.placement ?? ""} />
          <FieldError errors={state.fieldErrors?.placement} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Style
          <input name="style" className={inputClassName} placeholder="Fine line floral" defaultValue={state.values?.style ?? ""} />
          <FieldError errors={state.fieldErrors?.style} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Timing
          <input name="requestedWindow" className={inputClassName} placeholder="Weekday afternoons in April" defaultValue={state.values?.requestedWindow ?? ""} />
          <FieldError errors={state.fieldErrors?.requestedWindow} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Budget range
          <select name="budgetRange" className={inputClassName} defaultValue={state.values?.budgetRange ?? "$300-$600"}>
            <option value="$150-$300">$150-$300</option>
            <option value="$300-$600">$300-$600</option>
            <option value="$600-$1,000">$600-$1,000</option>
            <option value="$1,000+">$1,000+</option>
          </select>
          <FieldError errors={state.fieldErrors?.budgetRange} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Preferred artist
          <select name="preferredArtist" className={inputClassName} defaultValue={state.values?.preferredArtist ?? pageData.defaultPreferredArtist}>
            {pageData.artistOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.preferredArtist} />
        </label>
      </div>

      <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Tattoo idea
        <textarea name="ideaSummary" rows={4} className={`${inputClassName} resize-none`} placeholder="Describe the concept, scale, mood, and whether it connects to existing work." defaultValue={state.values?.ideaSummary ?? ""} />
        <FieldError errors={state.fieldErrors?.ideaSummary} />
      </label>

      <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Reference links and direction
        <textarea name="referenceSummary" rows={3} className={`${inputClassName} resize-none`} placeholder="Summarize your references, must-keep details, and any design constraints." defaultValue={state.values?.referenceSummary ?? ""} />
        <FieldError errors={state.fieldErrors?.referenceSummary} />
      </label>

      <div className="space-y-3 border-t border-[var(--ink)]/8 pt-5">
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Upload reference images (optional)
          <p className="mt-1 text-xs font-normal text-[var(--muted)]/70">
            Add up to 10 images showing styles you like, placements, or inspirations. JPG, PNG up to 10MB each.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className={`${inputClassName} cursor-pointer file:mr-2 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--brass)]/20 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[var(--brass)] hover:file:bg-[var(--brass)]/30`}
          />
        </label>

        {referenceImages.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">
              Uploaded images ({referenceImages.length})
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {referenceImages.map((img, idx) => (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-lg border border-[var(--brass)]/30 bg-[var(--brass)]/5"
                >
                  <div
                    className="h-32 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${img.url})` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="rounded-full bg-[var(--ember)] px-3 py-1 text-xs font-semibold text-white opacity-0 transition hover:bg-[var(--ember)]/90 group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="truncate bg-white/50 px-2 py-1 text-xs text-[var(--ink)]">
                    {img.fileName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-[var(--ink)]/8 pt-5">
        <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          How should we confirm receipt?
          <select name="confirmationChannel" className={inputClassName} defaultValue="Email">
            <option value="Email">Email confirmation</option>
            <option value="SMS">Text message confirmation</option>
            <option value="">No confirmation needed</option>
          </select>
          <p className="mt-1 text-xs font-normal text-[var(--muted)]/70">
            We&apos;ll send a message confirming we received your request.
          </p>
        </label>
      </div>

      <div className="flex flex-col gap-4 border-t border-[var(--ink)]/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm ${state.status === "error" ? "text-[var(--ember)]" : state.status === "success" ? "text-[var(--teal)]" : "text-[var(--muted)]"}`}>
          {state.message}
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}