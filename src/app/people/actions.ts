"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { z } from "zod";

import { requirePermission, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createAccountSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: z.string().trim().email("Email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["OWNER", "FRONT_DESK", "ARTIST"]),
  artistDisplayName: z.string().trim().optional(),
  artistBio: z.string().trim().optional(),
  artistSpecialties: z.string().trim().optional(),
  instagramHandle: z.string().trim().optional(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueArtistSlug(studioId: string, base: string) {
  let slug = base;
  let attempt = 1;

  while (true) {
    const existing = await prisma.artistProfile.findFirst({
      where: { studioId, slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    attempt += 1;
    slug = `${base}-${attempt}`;
  }
}

export async function createAccountAction(formData: FormData) {
  const currentUser = await requirePermission("accounts.manage");

  const parsed = createAccountSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "ARTIST"),
    artistDisplayName: String(formData.get("artistDisplayName") ?? "") || undefined,
    artistBio: String(formData.get("artistBio") ?? "") || undefined,
    artistSpecialties: String(formData.get("artistSpecialties") ?? "") || undefined,
    instagramHandle: String(formData.get("instagramHandle") ?? "") || undefined,
  });

  if (!parsed.success) {
    redirect(`/people?notice=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid form values")}`);
  }

  const values = parsed.data;

  const emailTaken = await prisma.user.findUnique({
    where: { email: values.email },
    select: { id: true },
  });

  if (emailTaken) {
    redirect(`/people?notice=${encodeURIComponent("An account with this email already exists.")}`);
  }

  const passwordHash = await hash(values.password, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        studioId: currentUser.studioId,
        name: values.name,
        email: values.email,
        passwordHash,
        role: values.role,
        isActive: true,
      },
    });

    if (values.role === "ARTIST") {
      const displayName = values.artistDisplayName || values.name;
      const baseSlug = slugify(displayName) || `artist-${randomBytes(4).toString("hex")}`;
      const slug = await uniqueArtistSlug(currentUser.studioId, baseSlug);

      const profile = await tx.artistProfile.create({
        data: {
          studioId: currentUser.studioId,
          userId: user.id,
          displayName,
          slug,
          bio: values.artistBio ?? null,
          specialties: values.artistSpecialties ?? null,
        },
      });

      if (values.instagramHandle) {
        const normalizedHandle = values.instagramHandle.replace(/^@+/, "");
        await tx.socialAccount.create({
          data: {
            studioId: currentUser.studioId,
            artistProfileId: profile.id,
            platform: "INSTAGRAM",
            scope: "ARTIST",
            handle: normalizedHandle,
            platformUserId: `ig_${normalizedHandle}_${randomBytes(3).toString("hex")}`,
            metadataJson: JSON.stringify({
              followers: 0,
              profileImageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80",
              recentImages: [
                "https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?auto=format&fit=crop&w=700&q=80",
                "https://images.unsplash.com/photo-1542727365-19732a80dcfd?auto=format&fit=crop&w=700&q=80",
                "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=700&q=80",
                "https://images.unsplash.com/photo-1581306172247-4b2b2f90f39e?auto=format&fit=crop&w=700&q=80",
              ],
            }),
          },
        });
      }
    }
  });

  revalidatePath("/people");
  revalidatePath("/social-inbox");
  redirect("/people?notice=Account%20created");
}

export async function deleteAccountAction(formData: FormData) {
  const currentUser = await requirePermission("accounts.destructive");
  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    redirect("/people?notice=Missing%20account%20id");
  }

  if (userId === currentUser.id) {
    redirect("/people?notice=You%20cannot%20delete%20your%20own%20account");
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, studioId: currentUser.studioId },
    include: {
      artistProfile: { select: { id: true } },
      _count: {
        select: {
          consultationsAssigned: true,
          consultationsCreated: true,
          appointments: true,
          designNotes: true,
          depositEvents: true,
          auditLogs: true,
        },
      },
    },
  });

  if (!target) {
    redirect("/people?notice=Account%20not%20found");
  }

  const activityCount =
    target._count.consultationsAssigned +
    target._count.consultationsCreated +
    target._count.appointments +
    target._count.designNotes +
    target._count.depositEvents +
    target._count.auditLogs;

  if (activityCount > 0) {
    redirect(
      "/people?notice=This%20account%20has%20activity%20history%20and%20cannot%20be%20deleted.%20Create%20a%20replacement%20instead.",
    );
  }

  await prisma.$transaction(async (tx) => {
    if (target.artistProfile?.id) {
      await tx.socialLead.updateMany({
        where: { artistProfileId: target.artistProfile.id },
        data: { artistProfileId: null },
      });

      await tx.campaignLink.updateMany({
        where: { artistProfileId: target.artistProfile.id },
        data: { artistProfileId: null },
      });

      await tx.socialAccount.deleteMany({
        where: { artistProfileId: target.artistProfile.id },
      });

      await tx.artistProfile.delete({
        where: { id: target.artistProfile.id },
      });
    }

    await tx.user.delete({ where: { id: target.id } });
  });

  revalidatePath("/people");
  revalidatePath("/social-inbox");
  redirect("/people?notice=Account%20deleted");
}

export async function deactivateAccountAction(formData: FormData) {
  const currentUser = await requirePermission("accounts.destructive");
  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    redirect("/people?notice=Missing%20account%20id");
  }

  if (userId === currentUser.id) {
    redirect("/people?notice=You%20cannot%20deactivate%20your%20own%20account");
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, studioId: currentUser.studioId },
    select: { id: true, isActive: true },
  });

  if (!target) {
    redirect("/people?notice=Account%20not%20found");
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      isActive: !target.isActive,
      deactivatedAt: target.isActive ? new Date() : null,
    },
  });

  revalidatePath("/people");
  revalidatePath("/social-inbox");
  redirect(`/people?notice=${target.isActive ? "Account%20deactivated" : "Account%20reactivated"}`);
}

export async function goToPersonProfileAction(formData: FormData) {
  await requireUser();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    redirect("/people");
  }

  redirect(`/people/${userId}`);
}
