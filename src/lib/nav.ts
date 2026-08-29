export type NavItem = {
  label: string;
  href: string;
};

export const tutorNav: NavItem[] = [
  { label: "ראשי", href: "/tutor/dashboard" },
  { label: "יומן", href: "/tutor/calendar" },
  { label: "בקשות לשיעורים", href: "/tutor/requests" },
  { label: "תלמידים", href: "/tutor/students" },
  { label: "סיכומי שיעורים", href: "/tutor/summaries" },
  { label: "שיעורי בית", href: "/tutor/homework" },
  { label: "תשלומים", href: "/tutor/payments" },
  { label: "הגדרות", href: "/tutor/settings" },
  { label: "פרופיל", href: "/tutor/profile" },
];

export const portalNav: NavItem[] = [
  { label: "ראשי", href: "/portal/dashboard" },
  { label: "השיעורים שלי", href: "/portal/lessons" },
  { label: "סיכומי שיעור", href: "/portal/summaries" },
  { label: "שיעורי בית", href: "/portal/homework" },
  { label: "חומרי עזר", href: "/portal/materials" },
  { label: "תשלומים", href: "/portal/payments" },
  { label: "פרופיל", href: "/portal/profile" },
];
