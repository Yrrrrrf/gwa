import Ban from "@lucide/svelte/icons/ban";
import ChartColumnBig from "@lucide/svelte/icons/chart-column-big";
import Check from "@lucide/svelte/icons/check";
import ChevronLeft from "@lucide/svelte/icons/chevron-left";
import ChevronRight from "@lucide/svelte/icons/chevron-right";
import ChevronUp from "@lucide/svelte/icons/chevron-up";
import ClipboardList from "@lucide/svelte/icons/clipboard-list";
import Clock from "@lucide/svelte/icons/clock";
import DollarSign from "@lucide/svelte/icons/dollar-sign";
import Eye from "@lucide/svelte/icons/eye";
import FileText from "@lucide/svelte/icons/file-text";
import House from "@lucide/svelte/icons/house";
import Image from "@lucide/svelte/icons/image";
import Info from "@lucide/svelte/icons/info";
import Layers from "@lucide/svelte/icons/layers";
import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
import LogOut from "@lucide/svelte/icons/log-out";
import Mail from "@lucide/svelte/icons/mail";
import MessageSquare from "@lucide/svelte/icons/message-square";
import Package from "@lucide/svelte/icons/package";
import Pencil from "@lucide/svelte/icons/pencil";
import Phone from "@lucide/svelte/icons/phone";
import Plus from "@lucide/svelte/icons/plus";
import Save from "@lucide/svelte/icons/save";
import Search from "@lucide/svelte/icons/search";
import Shield from "@lucide/svelte/icons/shield";
import Star from "@lucide/svelte/icons/star";
import Tag from "@lucide/svelte/icons/tag";
import Trash2 from "@lucide/svelte/icons/trash-2";
import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
import Trophy from "@lucide/svelte/icons/trophy";
import User from "@lucide/svelte/icons/user";
import X from "@lucide/svelte/icons/x";

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
