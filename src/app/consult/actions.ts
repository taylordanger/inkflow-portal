"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createPublicSocialLead } from "@/lib/social";
import type { PublicIntakeFormFields, PublicIntakeFormState, ReferenceImage } from "@/types/studio";

const publicIntakeSchema = z.object({
  clientName: z.string().trim().min(2, "Client name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(7, "Phone number is required."),
  placement: z.string().trim().min(2, "Placement is required."),
  style: z.string().trim().min(2, "Tattoo style is required."),
  budgetRange: z.enum(["$150-$300", "$300-$600", "$600-$1,000", "$1,000+"]),
  preferredArtist: z.enum(["Kai", "Mara", "Sol", "First available"]),
  requestedWindow: z.string().trim().min(2, "Requested timing is required."),
  ideaSummary: z.string().trim().min(20, "Add a short description of the tattoo idea."),
  referenceSummary: z.string().trim().min(10, "Describe the references or direction you have."),
});

const intakeAttributionSchema = z.object({
  studioSlug: z.string().trim().min(1),
  socialPlatform: z.enum(["Instagram", "TikTok", "Website"]),
  socialAccountId: z.string().trim().optional(),
  artistProfileId: z.string().trim().optional(),
  campaignLinkId: z.string().trim().optional(),
  confirmationChannel: z.enum(["Email", "SMS"]).optional(),
  referenceImages: z.string().optional(),
});

function readValues(formData: FormData): PublicIntakeFormFields {
  return {
    clientName: String(formData.get("clientName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    placement: String(formData.get("placement") ?? "").trim(),
    style: String(formData.get("style") ?? "").trim(),
    budgetRange: String(formData.get("budgetRange") ?? "$300-$600") as PublicIntakeFormFields["budgetRange"],
    preferredArtist: String(formData.get("preferredArtist") ?? "First available") as PublicIntakeFormFields["preferredArtist"],
    requestedWindow: String(formData.get("requestedWindow") ?? "").trim(),
    ideaSummary: String(formData.get("ideaSummary") ?? "").trim(),
    referenceSummary: String(formData.get("referenceSummary") ?? "").trim(),
  };
}

export async function createPublicSocialLeadAction(
  _previousState: PublicIntakeFormState,
  formData: FormData,
): Promise<PublicIntakeFormState> {
  const values = readValues(formData);
  const parsedValues = publicIntakeSchema.safeParse(values);

  const referenceImagesStr = String(formData.get("referenceImages") ?? "[]");
  let referenceImages: ReferenceImage[] | null = null;
  try {
    const parsed = JSON.parse(referenceImagesStr);
    referenceImages = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    // Continue without reference images if parsing fails
  }

  const confirmationChannelRaw = String(formData.get("confirmationChannel") ?? "").trim();
  const confirmationChannel =
    confirmationChannelRaw === "Email" || confirmationChannelRaw === "SMS"
      ? (confirmationChannelRaw as "Email" | "SMS")
      : null;

  const parsedAttribution = intakeAttributionSchema.safeParse({
    studioSlug: String(formData.get("studioSlug") ?? ""),
    socialPlatform: String(formData.get("socialPlatform") ?? "Website"),
    socialAccountId: String(formData.get("socialAccountId") ?? "") || undefined,
    artistProfileId: String(formData.get("artistProfileId") ?? "") || undefined,
    campaignLinkId: String(formData.get("campaignLinkId") ?? "") || undefined,
    confirmationChannel,
    referenceImages: referenceImagesStr,
  });

  if (!parsedValues.success) {
    return {
      status: "error",
      message: "Fix the highlighted fields before submitting your request.",
      fieldErrors: parsedValues.error.flatten().fieldErrors,
      values,
    };
  }

  if (!parsedAttribution.success) {
    return {
      status: "error",
      message: "This intake link is missing studio attribution. Please refresh and try again.",
      values,
    };
  }

  await createPublicSocialLead({
    studioSlug: parsedAttribution.data.studioSlug,
    socialPlatform: parsedAttribution.data.socialPlatform,
    socialAccountId: parsedAttribution.data.socialAccountId,
    artistProfileId: parsedAttribution.data.artistProfileId,
    campaignLinkId: parsedAttribution.data.campaignLinkId,
    values: parsedValues.data,
    referenceImages,
    confirmationChannel: parsedAttribution.data.confirmationChannel,
  });

  revalidatePath("/social-inbox");

  return {
    status: "success",
    message: "Your request is in with the studio. Front desk will review it and follow up with next steps.",
  };
}