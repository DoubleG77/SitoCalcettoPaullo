import {
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CirclePlus,
  ClipboardList,
  Crown,
  Footprints,
  Goal,
  LogOut,
  Medal,
  Pencil,
  Plus,
  Shield,
  Star,
  Trophy,
  UserRound,
  UsersRound,
  Vote,
  X,
} from "lucide-react"

const icons = {
  calendar: CalendarDays,
  camera: Camera,
  check: Check,
  down: ChevronDown,
  left: ChevronLeft,
  right: ChevronRight,
  up: ChevronUp,
  alert: CircleAlert,
  success: CircleCheck,
  addCircle: CirclePlus,
  clipboard: ClipboardList,
  crown: Crown,
  goals: Goal,
  boots: Footprints,
  logout: LogOut,
  medal: Medal,
  edit: Pencil,
  plus: Plus,
  shield: Shield,
  star: Star,
  trophy: Trophy,
  user: UserRound,
  users: UsersRound,
  ratings: Vote,
  close: X,
}

export default function AppIcon({ name, size = 18, color = "currentColor", strokeWidth = 2, title, ...props }) {
  const Icon = icons[name] || Shield

  return (
    <Icon
      aria-hidden={title ? undefined : true}
      aria-label={title}
      color={color}
      size={size}
      strokeWidth={strokeWidth}
      focusable="false"
      {...props}
    />
  )
}
