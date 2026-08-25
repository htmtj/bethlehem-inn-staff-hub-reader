import {
  Building2,
  ClipboardList,
  FileText,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Utensils,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const departmentIcons: Record<string, LucideIcon> = {
  programs: Users,
  facilities: Wrench,
  kitchen: Utensils,
  development: HeartHandshake,
  administration: Building2,
};

const resourceIcons: Record<string, LucideIcon> = {
  "Employee Tools": Users,
  Forms: ClipboardList,
  "Policies & Procedures": ShieldCheck,
  Training: GraduationCap,
  "Department Resources": FileText,
};

export function DepartmentIcon({ id, size = 24 }: { id: string; size?: number }) {
  const Icon = departmentIcons[id] ?? Building2;
  return <Icon aria-hidden="true" size={size} strokeWidth={1.9} />;
}

export function ResourceIcon({ category, size = 23 }: { category: string; size?: number }) {
  const Icon = resourceIcons[category] ?? FileText;
  return <Icon aria-hidden="true" size={size} strokeWidth={1.9} />;
}
