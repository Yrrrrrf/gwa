import ChevronUp from "lucide-svelte/icons/chevron-up";
import LogOut from "lucide-svelte/icons/log-out";
import Trophy from "lucide-svelte/icons/trophy";
import Compass from "lucide-svelte/icons/compass";
import Heart from "lucide-svelte/icons/heart";
import LayoutDashboard from "lucide-svelte/icons/layout-dashboard";
import Utensils from "lucide-svelte/icons/utensils";
import Store from "lucide-svelte/icons/store";
import Luggage from "lucide-svelte/icons/luggage";
import Shield from "lucide-svelte/icons/shield";
import Coins from "lucide-svelte/icons/coins";
import BookOpen from "lucide-svelte/icons/book-open";
import Plus from "lucide-svelte/icons/plus";
import Hand from "lucide-svelte/icons/hand";
import Search from "lucide-svelte/icons/search";
import ClipboardList from "lucide-svelte/icons/clipboard-list";
import MapPin from "lucide-svelte/icons/map-pin";
import User from "lucide-svelte/icons/user";
import House from "lucide-svelte/icons/house";
import Phone from "lucide-svelte/icons/phone";
import Mail from "lucide-svelte/icons/mail";
import Clock from "lucide-svelte/icons/clock";
import MessageSquare from "lucide-svelte/icons/message-square";
import Pencil from "lucide-svelte/icons/pencil";
import X from "lucide-svelte/icons/x";
import Save from "lucide-svelte/icons/save";
import DollarSign from "lucide-svelte/icons/dollar-sign";
import Tag from "lucide-svelte/icons/tag";
import FileText from "lucide-svelte/icons/file-text";
import Image from "lucide-svelte/icons/image";
import Package from "lucide-svelte/icons/package";
import Eye from "lucide-svelte/icons/eye";
import Ban from "lucide-svelte/icons/ban";
import MapPinned from "lucide-svelte/icons/map-pinned";
import Pointer from "lucide-svelte/icons/pointer";
import TriangleAlert from "lucide-svelte/icons/triangle-alert";
import Star from "lucide-svelte/icons/star";
import ChefHat from "lucide-svelte/icons/chef-hat";
import Check from "lucide-svelte/icons/check";
import Fish from "lucide-svelte/icons/fish";
import Flame from "lucide-svelte/icons/flame";
import CupSoda from "lucide-svelte/icons/cup-soda";
import CakeSlice from "lucide-svelte/icons/cake-slice";
import Salad from "lucide-svelte/icons/salad";
import Hamburger from "lucide-svelte/icons/hamburger";
import Soup from "lucide-svelte/icons/soup";
import Info from "lucide-svelte/icons/info";
import ChevronRight from "lucide-svelte/icons/chevron-right";
import ChevronLeft from "lucide-svelte/icons/chevron-left";
import Trash2 from "lucide-svelte/icons/trash-2";
import Radio from "lucide-svelte/icons/radio";
import CookingPot from "lucide-svelte/icons/cooking-pot";
import ShoppingCart from "lucide-svelte/icons/shopping-cart";
import ChartColumnBig from "lucide-svelte/icons/chart-column-big";

export const ICONS = {
	brand: Trophy,
	nav_discover: Compass,
	nav_saved: Heart,
	nav_dashboard: LayoutDashboard,
	nav_menu: Utensils,
	nav_profile: Store,
	dish: Utensils,
	store: Store,
	tourist: Luggage,
	admin: Shield,
	money: Coins,
	book_menu: BookOpen,
	add: Plus,
	wave: Hand,
	search: Search,
	clipboard: ClipboardList,
	map_pin: MapPin,
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
	pin: MapPinned,
	pointer: Pointer,
	warning: TriangleAlert,
	star: Star,
	cat_mexican: ChefHat,
	check: Check,
	info: Info,
	chevron_right: ChevronRight,
	chevron_left: ChevronLeft,
	trash: Trash2,
	radio: Radio,
	cooking_pot: CookingPot,
	shopping_cart: ShoppingCart,
	bar_chart: ChartColumnBig,
	flame: Flame,
	chevron_up: ChevronUp,
	logout: LogOut,
} as const;

export const CATEGORY_ICONS = {
	mexican: ChefHat,
	seafood: Fish,
	street_food: Flame,
	drinks: CupSoda,
	desserts: CakeSlice,
	vegetarian: Salad,
	fast_food: Hamburger,
	international: Soup,
} as const;

export const NAV_ICONS = {
	"/discover": Compass,
	"/saved": Heart,
	"/dashboard": LayoutDashboard,
	"/menu": Utensils,
	"/profile": Store,
	"/admin": Shield,
} as const;
