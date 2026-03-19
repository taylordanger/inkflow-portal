export type QueueStage =
  | "New inquiries"
  | "Consult scheduled"
  | "Awaiting deposit"
  | "Design review"
  | "Ready to tattoo";

export type ConsultationStage =
  | "New inquiry"
  | "Consult scheduled"
  | "Awaiting deposit"
  | "Design review"
  | "Booked";

export type PreferredArtist = "Kai" | "Mara" | "Sol" | "First available";

export type LeadSource =
  | "Instagram"
  | "TikTok"
  | "Walk-in"
  | "Referral"
  | "Website"
  | "Returning client";

export type BudgetRange =
  | "$150-$300"
  | "$300-$600"
  | "$600-$1,000"
  | "$1,000+";

export type DepositStatus = "Not requested" | "Requested" | "Paid";

export type AppointmentStatus =
  | "Scheduled"
  | "Rescheduled"
  | "Completed"
  | "Cancelled";

export type DesignApprovalStatus =
  | "Concept sent"
  | "Revision requested"
  | "Approved"
  | "Finalized";

export type ConsentStatus = "Pending" | "Sent" | "Signed" | "Expired";

export type DepositEventType =
  | "Request"
  | "Partial payment"
  | "Payment"
  | "Refund"
  | "Failed";

export type PortalPurpose = "Consent" | "Approval";

export type DeliveryChannel = "Email" | "SMS";

export type SocialPlatform = "Instagram" | "TikTok" | "Website";

export type SocialLeadStatus =
  | "New"
  | "Qualified"
  | "Converted"
  | "Archived"
  | "Spam";

export type LeadCaptureMethod =
  | "Link in bio"
  | "Lead form"
  | "Webhook"
  | "Manual import"
  | "DM import";

export type DeliveryStatus = "Pending" | "Sent" | "Failed" | "Unavailable";

export type DeliveryAttemptRecord = {
  id: string;
  attemptNumber: number;
  status: DeliveryStatus;
  channel: DeliveryChannel | null;
  target: string | null;
  errorMessage: string | null;
  attemptedAt: string;
};

export type AuditDomain = "Deposit" | "Consent" | "Approval" | "Security";

export type Metric = {
  label: string;
  value: string;
  delta: string;
};

export type WorkflowCard = {
  client: string;
  artist: string;
  note: string;
};

export type WorkflowColumn = {
  stage: QueueStage;
  accent: string;
  cards: WorkflowCard[];
};

export type ModuleCard = {
  name: string;
  href: string;
  summary: string;
  eyebrow: string;
};

export type TimelineEvent = {
  time: string;
  title: string;
  detail: string;
};

export type DomainPageContent = {
  title: string;
  eyebrow: string;
  description: string;
  highlights: string[];
  checklist: string[];
};

export type ConsultationRecord = {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  placement: string;
  style: string;
  budgetRange: BudgetRange;
  preferredArtist: PreferredArtist;
  leadSource: LeadSource;
  requestedWindow: string;
  ideaSummary: string;
  referenceSummary: string;
  stage: ConsultationStage;
  depositStatus: DepositStatus;
  depositAmount: number | null;
  depositPaidAmount: number;
  depositFailureReason: string | null;
  bookingLocked: boolean;
  bookingLockedReason: string | null;
  assignedArtistId: string | null;
  createdById: string | null;
  artistAssignment: string;
  nextStep: string;
  submittedAt: string;
  createdByName: string | null;
  appointment: AppointmentRecord | null;
  designNotes: DesignNoteRecord[];
  approvalEvents: DesignApprovalEventRecord[];
  depositEvents: DepositEventRecord[];
  auditEntries: AuditEntryRecord[];
  approvalPortalPath: string | null;
  approvalDeliveryLabel: string | null;
  approvalDeliveryStatus: DeliveryStatus | null;
  approvalDeliveryError: string | null;
  approvalDeliveryAttempts: DeliveryAttemptRecord[];
  socialPlatform: SocialPlatform | null;
  socialHandle: string | null;
  sourceCampaignLabel: string | null;
  sourceArtistProfile: string | null;
};

export type SocialAccountRecord = {
  id: string;
  platform: SocialPlatform;
  handle: string;
  scope: "Studio" | "Artist";
  status: "Active" | "Expired" | "Revoked" | "Error";
  artistProfileName: string | null;
  artistUserId: string | null;
  profileImageUrl: string | null;
  frontPagePath: string | null;
  instagramProfileUrl: string | null;
  instagramPreviewImages: string[];
};

export type ReferenceImage = {
  url: string;
  fileName: string;
  uploadedAt: string;
};

export type SocialLeadRecord = {
  id: string;
  platform: SocialPlatform;
  captureMethod: LeadCaptureMethod;
  status: SocialLeadStatus;
  clientName: string | null;
  preferredArtistName: string | null;
  handle: string | null;
  email: string | null;
  phone: string | null;
  placement: string | null;
  style: string | null;
  budgetRange: string | null;
  requestedWindow: string | null;
  messageBody: string | null;
  referenceSummary: string | null;
  sourceUrl: string | null;
  attributionSummary: string | null;
  createdAt: string;
  artistProfileName: string | null;
  artistUserId: string | null;
  socialAccountHandle: string | null;
  campaignLabel: string | null;
  consultationId: string | null;
  referenceImages: ReferenceImage[] | null;
  confirmationSentAt: string | null;
  confirmationSentVia: DeliveryChannel | null;
  infoRequestedAt: string | null;
  infoRequestedBy: string | null;
  infoRequestedByName: string | null;
  infoRequestedFields: string[] | null;
  infoRequestMessage: string | null;
};

export type PublicIntakeFormFields = {
  clientName: string;
  email: string;
  phone: string;
  placement: string;
  style: string;
  budgetRange: BudgetRange;
  preferredArtist: PreferredArtist;
  requestedWindow: string;
  ideaSummary: string;
  referenceSummary: string;
};

export type PublicIntakeFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<keyof PublicIntakeFormFields, string[]>>;
  values?: Partial<PublicIntakeFormFields>;
};

export type PublicIntakePageData = {
  studioName: string;
  studioSlug: string;
  artistName: string | null;
  artistBio: string | null;
  artistSpecialties: string | null;
  artistHandle: string | null;
  socialPlatform: SocialPlatform;
  defaultPreferredArtist: PreferredArtist;
  artistOptions: PreferredArtist[];
  campaignCode: string | null;
  campaignLabel: string | null;
  socialAccountId: string | null;
  artistProfileId: string | null;
  campaignLinkId: string | null;
  destinationPath: string;
};

export type SocialInboxPageData = {
  studioName: string;
  connectedAccounts: SocialAccountRecord[];
  leads: SocialLeadRecord[];
  stats: {
    totalLeads: number;
    newLeads: number;
    convertedLeads: number;
    connectedAccounts: number;
  };
};

export type DesignNoteRecord = {
  id: string;
  note: string;
  authorName: string;
  createdAt: string;
};

export type DesignApprovalEventRecord = {
  id: string;
  status: DesignApprovalStatus;
  note: string | null;
  createdAt: string;
};

export type AppointmentRecord = {
  id: string;
  consultationId: string;
  clientName: string;
  artistId: string;
  artistName: string;
  startsAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes: string | null;
};

export type ArtistOption = {
  id: string;
  name: string;
  email: string;
};

export type StaffRoleLabel = "Owner" | "Front desk" | "Artist";

export type PersonSummaryRecord = {
  id: string;
  name: string;
  email: string;
  role: StaffRoleLabel;
  isActive: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  artistProfileId: string | null;
  artistSlug: string | null;
  artistDisplayName: string | null;
  assignedConsultations: number;
  createdConsultations: number;
  appointments: number;
};

export type PersonConsultationRecord = {
  id: string;
  clientName: string;
  stage: ConsultationStage;
  submittedAt: string;
};

export type PersonAppointmentRecord = {
  id: string;
  clientName: string;
  startsAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
};

export type PersonDesignNoteRecord = {
  id: string;
  clientName: string;
  note: string;
  createdAt: string;
};

export type PersonSocialLeadRecord = {
  id: string;
  clientName: string | null;
  handle: string | null;
  status: SocialLeadStatus;
  platform: SocialPlatform;
  createdAt: string;
};

export type PersonDetailPageData = {
  id: string;
  name: string;
  email: string;
  role: StaffRoleLabel;
  isActive: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  artistProfile: {
    id: string;
    displayName: string;
    slug: string;
    bio: string | null;
    specialties: string | null;
    socialHandles: string[];
  } | null;
  assignedConsultations: PersonConsultationRecord[];
  createdConsultations: PersonConsultationRecord[];
  appointments: PersonAppointmentRecord[];
  designNotes: PersonDesignNoteRecord[];
  socialLeads: PersonSocialLeadRecord[];
};

export type ClientRecord = {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  totalConsultations: number;
  activeStage: ConsultationStage;
  assignedArtist: string;
  latestPlacement: string;
  nextAppointmentAt: string | null;
  totalDepositsPaid: number;
};

export type ClientConsultationHistoryRecord = {
  id: string;
  submittedAt: string;
  stage: ConsultationStage;
  placement: string;
  style: string;
  budgetRange: BudgetRange;
  preferredArtist: PreferredArtist;
  leadSource: LeadSource;
  assignedArtistName: string | null;
  createdByName: string | null;
  depositStatus: DepositStatus;
  depositAmount: number | null;
  depositPaidAmount: number;
  ideaSummary: string;
  referenceSummary: string;
  socialPlatform: SocialPlatform | null;
  socialHandle: string | null;
  sourceCampaignLabel: string | null;
};

export type ClientAppointmentHistoryRecord = {
  id: string;
  consultationId: string;
  startsAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  artistName: string;
  notes: string | null;
};

export type ClientSocialOriginRecord = {
  id: string;
  platform: SocialPlatform;
  handle: string | null;
  campaignLabel: string | null;
  attributionSummary: string | null;
  referenceSummary: string | null;
  createdAt: string;
};

export type ClientDetailPageData = {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  totalConsultations: number;
  totalDepositsPaid: number;
  nextAppointmentAt: string | null;
  activeStage: ConsultationStage;
  consultations: ClientConsultationHistoryRecord[];
  appointments: ClientAppointmentHistoryRecord[];
  socialOrigins: ClientSocialOriginRecord[];
  timeline: ClientTimelineEventRecord[];
};

export type ClientTimelineEventRecord = {
  id: string;
  occurredAt: string;
  type:
    | "Consultation submitted"
    | "Deposit event"
    | "Appointment update"
    | "Social origin";
  title: string;
  detail: string;
  consultationId: string | null;
};

export type ConsentFormRecord = {
  id: string;
  consultationId: string;
  clientLegalName: string;
  artistName: string;
  appointmentAt: string | null;
  status: ConsentStatus;
  signedAt: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  healthNotes: string | null;
  consentPortalPath: string | null;
  deliveryLabel: string | null;
  deliveryStatus: DeliveryStatus | null;
  deliveryError: string | null;
  deliveryAttempts: DeliveryAttemptRecord[];
  auditEntries: AuditEntryRecord[];
};

export type AuditChangeRecord = {
  id: string;
  fieldPath: string;
  beforeValue: string | null;
  afterValue: string | null;
};

export type DepositEventRecord = {
  id: string;
  type: DepositEventType;
  amount: number | null;
  note: string | null;
  actorName: string | null;
  createdAt: string;
};

export type AuditEntryRecord = {
  id: string;
  domain: AuditDomain;
  action: string;
  details: string | null;
  actorName: string;
  actorRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  changes: AuditChangeRecord[];
  createdAt: string;
};

export type ConsultationFormFields = {
  clientName: string;
  email: string;
  phone: string;
  placement: string;
  style: string;
  budgetRange: BudgetRange;
  preferredArtist: PreferredArtist;
  leadSource: LeadSource;
  requestedWindow: string;
  ideaSummary: string;
  referenceSummary: string;
};

export type ConsultationFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<keyof ConsultationFormFields, string[]>>;
  values?: Partial<ConsultationFormFields>;
};