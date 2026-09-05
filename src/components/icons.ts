/**
 * The icon registry (X17). One lucide glyph per entity kind, per badge state and
 * per action, so a screen never picks its own. Stroke is 1.75 everywhere, sizes
 * are the two §1.5 allows, and a directional glyph is chosen by `dir` in code,
 * never rotated with CSS (O10, §9.5). Placement rule: `docs/ref/components.md`.
 */

import { createElement, forwardRef, useContext } from 'react'
import { LanguageContext } from '@/hooks/useLanguage'
import {
  ArrowDownIcon as RawArrowDown,
  ArrowLeftIcon as RawArrowLeft,
  ArrowRightIcon as RawArrowRight,
  ArrowUpIcon as RawArrowUp,
  ArrowUpDownIcon as RawArrowUpDown,
  BanIcon as RawBan,
  BanknoteIcon as RawBanknote,
  BellOffIcon as RawBellOff,
  Building2Icon as RawBuilding2,
  CalendarIcon as RawCalendar,
  ChartLineIcon as RawChartLine,
  BarChart3Icon as RawBarChart3,
  BellIcon as RawBell,
  CarFrontIcon as RawCarFront,
  CheckIcon as RawCheck,
  ChevronDownIcon as RawChevronDown,
  ChevronLeftIcon as RawChevronLeft,
  ChevronRightIcon as RawChevronRight,
  ChevronsUpDownIcon as RawChevronsUpDown,
  CircleAlertIcon as RawCircleAlert,
  CircleCheckIcon as RawCircleCheck,
  CirclePauseIcon as RawCirclePause,
  CircleXIcon as RawCircleX,
  ClockIcon as RawClock,
  Columns3Icon as RawColumns3,
  DivideIcon as RawDivide,
  CopyIcon as RawCopy,
  DownloadIcon as RawDownload,
  EllipsisIcon as RawEllipsis,
  EyeOffIcon as RawEyeOff,
  SendHorizontalIcon as RawSendHorizontal,
  FilePlus2Icon as RawFilePlus2,
  FileSpreadsheetIcon as RawFileSpreadsheet,
  FilterIcon as RawFilter,
  FlagIcon as RawFlag,
  FileTextIcon as RawFileText,
  HashIcon as RawHash,
  GitBranchIcon as RawGitBranch,
  GripVerticalIcon as RawGripVertical,
  HistoryIcon as RawHistory,
  HourglassIcon as RawHourglass,
  ImageIcon as RawImage,
  InboxIcon as RawInbox,
  InfoIcon as RawInfo,
  LayoutDashboardIcon as RawLayoutDashboard,
  LibraryBigIcon as RawLibraryBig,
  LifeBuoyIcon as RawLifeBuoy,
  LineChartIcon as RawLineChart,
  Link2Icon as RawLink2,
  ListFilterIcon as RawListFilter,
  MailIcon as RawMail,
  MapIcon as RawMap,
  MessageCircleIcon as RawMessageCircle,
  MessageSquareIcon as RawMessageSquare,
  PhoneIcon as RawPhone,
  PercentIcon as RawPercent,
  Maximize2Icon as RawMaximize2,
  MinusIcon as RawMinus,
  PlusIcon as RawPlus,
  PieChartIcon as RawPieChart,
  RefreshCwIcon as RawRefreshCw,
  RepeatIcon as RawRepeat,
  ReplaceIcon as RawReplace,
  RouteIcon as RawRoute,
  SaveIcon as RawSave,
  ScaleIcon as RawScale,
  SearchIcon as RawSearch,
  ShieldCheckIcon as RawShieldCheck,
  SirenIcon as RawSiren,
  SnowflakeIcon as RawSnowflake,
  StarIcon as RawStar,
  Table2Icon as RawTable2,
  Trash2Icon as RawTrash2,
  TriangleAlertIcon as RawTriangleAlert,
  UserRoundIcon as RawUserRound,
  UserRoundPlusIcon as RawUserRoundPlus,
  XIcon as RawX,
} from 'lucide-react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import type { Direction } from '@/lib'

/**
 * §1.5's two sizes, as classes. 16px inline, 20px in the top bar; nothing else.
 * Applied by the call site so an icon inherits the slot it sits in.
 */
export const ICON_INLINE = 'size-4'
export const ICON_TOPBAR = 'size-5'

/**
 * Lucide draws at a 2px stroke, which is heavier than §1.5's monoline beside
 * 13px text. Every export below is wrapped so the weight is decided once; a
 * call site can still pass `strokeWidth` and win.
 */
export const ICON_STROKE = 1.75

function icon(Base: LucideIcon, displayName: string): LucideIcon {
  const Wrapped = forwardRef<SVGSVGElement, LucideProps>((props, ref) =>
    createElement(Base, { strokeWidth: ICON_STROKE, ...props, ref }),
  )
  Wrapped.displayName = displayName
  return Wrapped as LucideIcon
}

/* ── Entity kinds (§6.4's record types) ─────────────────────────────────── */

export const CaptainIcon = icon(RawCarFront, 'CaptainIcon')
export const RiderIcon = icon(RawUserRound, 'RiderIcon')
export const TripIcon = icon(RawRoute, 'TripIcon')
export const SubscriptionIcon = icon(RawRepeat, 'SubscriptionIcon')
export const RequestIcon = icon(RawInbox, 'RequestIcon')
export const CorporateAccountIcon = icon(RawBuilding2, 'CorporateAccountIcon')
export const ZoneIcon = icon(RawMap, 'ZoneIcon')
export const ApplicationIcon = icon(RawFileText, 'ApplicationIcon')
export const TicketIcon = icon(RawLifeBuoy, 'TicketIcon')
export const DisputeIcon = icon(RawScale, 'DisputeIcon')

/* ── Badge states. R7 gives the tone; the glyph never carries it alone. ──── */

export const FiringIcon = icon(RawSiren, 'FiringIcon')
export const ArmedIcon = icon(RawShieldCheck, 'ArmedIcon')
export const SuspendedIcon = icon(RawCirclePause, 'SuspendedIcon')
export const MutedIcon = icon(RawBellOff, 'MutedIcon')
export const DisabledIcon = icon(RawBan, 'DisabledIcon')
export const BreachedIcon = icon(RawTriangleAlert, 'BreachedIcon')
export const PendingIcon = icon(RawClock, 'PendingIcon')
export const ApprovedIcon = icon(RawCircleCheck, 'ApprovedIcon')
export const RejectedIcon = icon(RawCircleX, 'RejectedIcon')

/* ── Actions ────────────────────────────────────────────────────────────── */

export const ApproveIcon = icon(RawCheck, 'ApproveIcon')
export const RejectIcon = icon(RawX, 'RejectIcon')
export const AssignIcon = icon(RawUserRoundPlus, 'AssignIcon')
export const ReassignIcon = icon(RawReplace, 'ReassignIcon')
export const FlagIcon = icon(RawFlag, 'FlagIcon')
export const FreezeIcon = icon(RawSnowflake, 'FreezeIcon')
export const ExportIcon = icon(RawDownload, 'ExportIcon')
export const FilterIcon = icon(RawListFilter, 'FilterIcon')
export const SortIcon = icon(RawArrowUpDown, 'SortIcon')
export const SortAscIcon = icon(RawArrowUp, 'SortAscIcon')
export const SortDescIcon = icon(RawArrowDown, 'SortDescIcon')
export const ColumnsIcon = icon(RawColumns3, 'ColumnsIcon')
export const RefreshIcon = icon(RawRefreshCw, 'RefreshIcon')
/* The map surface's three: two zoom steps and the expand (T9.11, X17). */
export const ZoomInIcon = icon(RawPlus, 'ZoomInIcon')
export const ZoomOutIcon = icon(RawMinus, 'ZoomOutIcon')
export const ExpandIcon = icon(RawMaximize2, 'ExpandIcon')
export const SearchIcon = icon(RawSearch, 'SearchIcon')
export const MoreIcon = icon(RawEllipsis, 'MoreIcon')
export const InfoIcon = icon(RawInfo, 'InfoIcon')
export const CheckIcon = icon(RawCheck, 'CheckIcon')
export const CloseIcon = icon(RawX, 'CloseIcon')
export const CopyIcon = icon(RawCopy, 'CopyIcon')
export const DeleteIcon = icon(RawTrash2, 'DeleteIcon')
export const SaveIcon = icon(RawSave, 'SaveIcon')
export const LinkIcon = icon(RawLink2, 'LinkIcon')
export const DragHandleIcon = icon(RawGripVertical, 'DragHandleIcon')
export const SortNoneIcon = icon(RawChevronsUpDown, 'SortNoneIcon')
/* Reorder, not sort: a tile moves up or down an ordered list (§11.2). */
export const MoveUpIcon = icon(RawArrowUp, 'MoveUpIcon')
export const MoveDownIcon = icon(RawArrowDown, 'MoveDownIcon')
export const CsvIcon = icon(RawFileSpreadsheet, 'CsvIcon')
export const ImageIcon = icon(RawImage, 'ImageIcon')
export const NewReportIcon = icon(RawFilePlus2, 'NewReportIcon')
export const LibraryIcon = icon(RawLibraryBig, 'LibraryIcon')
export const HistoryIcon = icon(RawHistory, 'HistoryIcon')
export const CalendarIcon = icon(RawCalendar, 'CalendarIcon')

/* ── Conversation channels (D19, design 12 §3.1). One glyph per channel; the
      WhatsApp one is a generic bubble, since the registry carries no brand
      marks (§1.5). None mirrors. ─────────────────────────────────────────── */

export const ChatIcon = icon(RawMessageSquare, 'ChatIcon')
export const EmailIcon = icon(RawMail, 'EmailIcon')
export const PhoneIcon = icon(RawPhone, 'PhoneIcon')
export const WhatsAppIcon = icon(RawMessageCircle, 'WhatsAppIcon')

/* The composer's two registers (AC-CC-11 carrier 1): a reply leaves the
   building, a note never does. Neither mirrors. */
export const SendIcon = icon(RawSendHorizontal, 'SendIcon')
export const NoteIcon = icon(RawEyeOff, 'NoteIcon')

/* ── Report shapes and modes (§12). One glyph per `ChartType` and per mode. ─ */

export const LineChartIcon = icon(RawLineChart, 'LineChartIcon')
export const BarChartIcon = icon(RawBarChart3, 'BarChartIcon')
export const PieChartIcon = icon(RawPieChart, 'PieChartIcon')
export const TableChartIcon = icon(RawTable2, 'TableChartIcon')
/* Lucide's `Filter` IS the funnel outline; `ListFilter` is the toolbar action
   above. A journey branches, so it keeps `GitBranch`. */
export const FunnelIcon = icon(RawFilter, 'FunnelIcon')
export const JourneyIcon = icon(RawGitBranch, 'JourneyIcon')
export const RetentionIcon = icon(RawRepeat, 'RetentionIcon')
export const DashboardIcon = icon(RawLayoutDashboard, 'DashboardIcon')
export const AlertRuleIcon = icon(RawBell, 'AlertRuleIcon')
export const CoolingIcon = icon(RawHourglass, 'CoolingIcon')
export const NotWorkingIcon = icon(RawCircleAlert, 'NotWorkingIcon')

/* ── Measures. One glyph per `MetricUnit`, plus the two marks a board's
      chrome draws. The §1.5 card-title exception is `ChartCard`'s own and is
      recorded there; nothing else may put one on a heading. ─────────────── */

export const MoneyIcon = icon(RawBanknote, 'MoneyIcon')
export const CountIcon = icon(RawHash, 'CountIcon')
export const PercentIcon = icon(RawPercent, 'PercentIcon')
export const DurationIcon = icon(RawClock, 'DurationIcon')
export const RatingIcon = icon(RawStar, 'RatingIcon')
export const RatioIcon = icon(RawDivide, 'RatioIcon')
export const ChartIcon = icon(RawChartLine, 'ChartIcon')

/* ── Deltas. A caret encodes magnitude, not reading order: it never mirrors
      (§9.5), which is why it is not in the directional block below. ─────── */

export const DeltaUpIcon = icon(RawArrowUp, 'DeltaUpIcon')
export const DeltaDownIcon = icon(RawArrowDown, 'DeltaDownIcon')

/* ── Directional glyphs. Never used raw; go through the helpers below. ──── */

export const ArrowLeftIcon = icon(RawArrowLeft, 'ArrowLeftIcon')
export const ArrowRightIcon = icon(RawArrowRight, 'ArrowRightIcon')
export const ChevronLeftIcon = icon(RawChevronLeft, 'ChevronLeftIcon')
export const ChevronRightIcon = icon(RawChevronRight, 'ChevronRightIcon')
export const ChevronDownIcon = icon(RawChevronDown, 'ChevronDownIcon')

/**
 * The one place direction reaches a glyph (O10). Pass the pair as it reads in
 * LTR and get the member that reads the same way in `dir`; in Arabic the two
 * swap. The CSS rotation convention is retired: it cannot reach a text glyph,
 * and two conventions is how a chevron ends up backwards.
 */
export function directionalIcon(
  dir: Direction,
  StartIcon: LucideIcon,
  EndIcon: LucideIcon,
): LucideIcon {
  return dir === 'rtl' ? EndIcon : StartIcon
}

/**
 * Direction for a primitive that takes no props of its own. Reads the language
 * context when there is one and falls back to `<html dir>` (AC-70), so a
 * `ui/` component rendered on its own in a test still mirrors and never throws.
 */
export function useIconDirection(): Direction {
  const language = useContext(LanguageContext)
  if (language !== null) return language.dir
  if (typeof document === 'undefined') return 'ltr'
  return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
}

/** Backwards through the reading order: left in LTR, right in Arabic. */
export function backIcon(dir: Direction): LucideIcon {
  return directionalIcon(dir, ArrowLeftIcon, ArrowRightIcon)
}

/** Forwards through the reading order. */
export function forwardIcon(dir: Direction): LucideIcon {
  return directionalIcon(dir, ArrowRightIcon, ArrowLeftIcon)
}

/** The pager's previous chevron, and its next. */
export function previousIcon(dir: Direction): LucideIcon {
  return directionalIcon(dir, ChevronLeftIcon, ChevronRightIcon)
}

export function nextIcon(dir: Direction): LucideIcon {
  return directionalIcon(dir, ChevronRightIcon, ChevronLeftIcon)
}
