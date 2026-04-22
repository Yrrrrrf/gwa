import ChevronUp from "@lucide/svelte/icons/chevron-up";
import LogOut from "@lucide/svelte/icons/log-out";
import Trophy from "@lucide/svelte/icons/trophy";
import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
import Shield from "@lucide/svelte/icons/shield";
import Plus from "@lucide/svelte/icons/plus";
import Search from "@lucide/svelte/icons/search";
import ClipboardList from "@lucide/svelte/icons/clipboard-list";
import User from "@lucide/svelte/icons/user";
import House from "@lucide/svelte/icons/house";
import Phone from "@lucide/svelte/icons/phone";
import Mail from "@lucide/svelte/icons/mail";
import Clock from "@lucide/svelte/icons/clock";
import MessageSquare from "@lucide/svelte/icons/message-square";
import Pencil from "@lucide/svelte/icons/pencil";
import X from "@lucide/svelte/icons/x";
import Save from "@lucide/svelte/icons/save";
import DollarSign from "@lucide/svelte/icons/dollar-sign";
import Tag from "@lucide/svelte/icons/tag";
import FileText from "@lucide/svelte/icons/file-text";
import Image from "@lucide/svelte/icons/image";
import Package from "@lucide/svelte/icons/package";
import Eye from "@lucide/svelte/icons/eye";
import Ban from "@lucide/svelte/icons/ban";
import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
import Star from "@lucide/svelte/icons/star";
import Check from "@lucide/svelte/icons/check";
import Info from "@lucide/svelte/icons/info";
import ChevronRight from "@lucide/svelte/icons/chevron-right";
import ChevronLeft from "@lucide/svelte/icons/chevron-left";
import Trash2 from "@lucide/svelte/icons/trash-2";
import ChartColumnBig from "@lucide/svelte/icons/chart-column-big";
import Layers from "@lucide/svelte/icons/layers";

export const ICONS = {
  brand: Trophy,
  nav_items: Layers,
  nav_dashboard: LayoutDashboard,
  nav_profile: User,
  admin: Shield,
  add: Plus,
  search: Search,
  clipboard: ClipboardList,
  user: User,
  home: House,
  phone: Phone,
  email: Mail,
  clock: Clock,
  description: MessageSquare,
  edit: Pencil,
  close: X,
  save: Save,
  price: DollarSign,
  tag: Tag,
  note: FileText,
  image: Image,
  package: Package,
  view_action: Eye,
  ban: Ban,
  warning: TriangleAlert,
  star: Star,
  check: Check,
  info: Info,
  chevron_right: ChevronRight,
  chevron_left: ChevronLeft,
  trash: Trash2,
  bar_chart: ChartColumnBig,
  chevron_up: ChevronUp,
  logout: LogOut,
} as const;

export const NAV_ICONS = {
  "/items": Layers,
  "/dashboard": LayoutDashboard,
  "/profile": User,
  "/admin": Shield,
} as const;
