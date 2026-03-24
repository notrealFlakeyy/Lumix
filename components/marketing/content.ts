import type { LucideIcon } from 'lucide-react'
import {
  ArrowRightLeft,
  BadgeCheck,
  Boxes,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Clock3,
  CreditCard,
  FileStack,
  Handshake,
  Headset,
  LifeBuoy,
  MapPinned,
  MessageSquareShare,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Truck,
  Waypoints,
} from 'lucide-react'

export type MarketingLink = {
  href: string
  label: string
}

export type MarketingCard = {
  title: string
  summary: string
  icon: LucideIcon
  points?: string[]
}

export const marketingNavLinks: MarketingLink[] = [
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export const heroSignals = [
  'Transport systems and office workflow design',
  'Driver, dispatch, and finance in one service layer',
  'Rollout support for growing transport companies',
] as const

export const homepageOfferings: MarketingCard[] = [
  {
    title: 'Software that fits transport work',
    summary: 'Lumix combines dispatch, driver workflow, office coordination, and finance follow-through in one calmer operating system.',
    icon: Truck,
  },
  {
    title: 'Implementation with real workflow focus',
    summary: 'We help shape rollout around the places where manual coordination, repeated entry, and delayed follow-through hurt most.',
    icon: BadgeCheck,
  },
  {
    title: 'Longer-term operational partner',
    summary: 'The goal is not only a launch. It is an operating setup that can keep improving as the company grows and the office evolves.',
    icon: Headset,
  },
] as const

export const homepageOutcomes = [
  'Less manual coordination between dispatch and office staff',
  'Cleaner handoff from completed trips to invoicing and reporting',
  'A more focused driver experience in the field',
  'A stronger public presence for the company alongside the portal',
] as const

export const companyServiceAreas: MarketingCard[] = [
  {
    title: 'Platform delivery',
    summary: 'A transport-focused operating platform covering dispatch, trips, mobile driver actions, invoicing, and office follow-through.',
    icon: Truck,
    points: ['Transport core and office workflow in one system', 'Public website plus portal direction', 'Module-ready foundation for future expansion'],
  },
  {
    title: 'Implementation and onboarding',
    summary: 'A rollout approach that starts with the workflows causing the most friction today, then expands from a stable operational base.',
    icon: BadgeCheck,
    points: ['Workflow mapping and rollout scoping', 'Data import and setup support', 'Team onboarding around real office processes'],
  },
  {
    title: 'Ongoing support and optimization',
    summary: 'A longer-term service relationship focused on improving adoption, tightening workflows, and expanding the platform when the company is ready.',
    icon: Headset,
    points: ['Process refinement after launch', 'Operational review and feedback loops', 'Support for additional module rollout'],
  },
] as const

export const customerProfiles: MarketingCard[] = [
  {
    title: 'Growing haulage and transport companies',
    summary: 'Best for teams where the office workload grows faster than the current systems can handle cleanly.',
    icon: Truck,
  },
  {
    title: 'Operations with recurring admin burden',
    summary: 'A strong fit when invoicing, proof follow-through, approvals, imports, and reporting are scattered across too many tools.',
    icon: CreditCard,
  },
  {
    title: 'Businesses ready for a phased rollout',
    summary: 'Ideal when the company wants to improve core transport execution first and add more office services over time.',
    icon: Boxes,
  },
] as const

export const homepageUseCases = [
  {
    title: 'Recurring route and customer work',
    detail: 'Use Lumix to manage repeat operational work with clearer planning, recurring order support, and better follow-through into invoicing.',
  },
  {
    title: 'Dispatch and office coordination',
    detail: 'Keep the transport planner, office admin team, and field staff in a more shared operating rhythm instead of bouncing between tools and calls.',
  },
  {
    title: 'Driver visibility and proof capture',
    detail: 'Give drivers a more focused mobile experience while the office gains clearer proof, checkpoint, and trip-status visibility.',
  },
  {
    title: 'Operational expansion without fragmentation',
    detail: 'Start with the transport core, then add adjacent workflows like workforce, finance follow-through, and data operations as the business grows.',
  },
] as const

export const serviceCards: MarketingCard[] = [
  {
    title: 'Transport operations command',
    summary: 'Plan, assign, and follow transport orders, trips, vehicles, and drivers from one shared operations layer.',
    icon: Truck,
    points: ['Dispatch board and trip control', 'Branch-aware access and visibility', 'Quote-to-order and recurring work'],
  },
  {
    title: 'Driver mobile experience',
    summary: 'Give field teams a focused mobile workflow for time, trip progress, checkpoints, and delivery proof.',
    icon: MapPinned,
    points: ['Trip start and completion actions', 'Proof of delivery and document capture', 'Mobile-first shift and route context'],
  },
  {
    title: 'Office automation',
    summary: 'Reduce manual coordination with alerts, search, imports, approvals, and templated recurring admin work.',
    icon: Sparkles,
    points: ['Global search across entities', 'CSV import and validation', 'Alerts for overdue and pending work'],
  },
  {
    title: 'Finance follow-through',
    summary: 'Move from completed work to invoices, payments, reminders, and accounting-ready handoff without losing context.',
    icon: CreditCard,
    points: ['Invoice generation from trips', 'Branded invoice PDFs and reminders', 'Receivables and payable visibility'],
  },
  {
    title: 'Implementation and rollout',
    summary: 'Start with the highest-friction transport workflows first, then expand into the rest of the office when ready.',
    icon: Boxes,
    points: ['Module-based rollout path', 'Branch and team setup support', 'Data migration and onboarding guidance'],
  },
  {
    title: 'Support and optimization',
    summary: 'Keep improving after launch with workflow tuning, adoption support, and data-quality cleanup.',
    icon: LifeBuoy,
    points: ['Operational review sessions', 'Workflow and permission tuning', 'Master-data cleanup support'],
  },
]

export const experienceCards: MarketingCard[] = [
  {
    title: 'Dispatch and trip control',
    summary: 'Monitor active work, coordinate drivers, and keep delivery execution visible without juggling disconnected tools.',
    icon: Waypoints,
  },
  {
    title: 'Searchable office memory',
    summary: 'Find quotes, orders, invoices, customers, and vehicles quickly when the office is moving fast.',
    icon: ScanSearch,
  },
  {
    title: 'Financial follow-through',
    summary: 'Keep admin teams close to operations so invoicing and payment follow-up happen with less rework.',
    icon: FileStack,
  },
]

export const processSteps: MarketingCard[] = [
  {
    title: 'Map the current office flow',
    summary: 'We identify the real coordination points between dispatch, drivers, invoicing, and management reporting.',
    icon: MessageSquareShare,
  },
  {
    title: 'Launch the operational core',
    summary: 'Start with the workflows that remove the most manual effort first, usually orders, trips, proof, and invoicing.',
    icon: BadgeCheck,
  },
  {
    title: 'Add office services intentionally',
    summary: 'Bring in approvals, imports, finance, workforce, or other modules when the team is ready for them.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Refine with real usage',
    summary: 'Use live feedback and production data to tune the system so it fits the company, not the other way around.',
    icon: ChartNoAxesCombined,
  },
]

export const companyPrinciples: MarketingCard[] = [
  {
    title: 'Operations first',
    summary: 'The product is built around how transport companies actually coordinate work day to day, not around generic admin patterns.',
    icon: Truck,
  },
  {
    title: 'Calm, premium software',
    summary: 'We aim for a product that feels clear and reliable under pressure, with better hierarchy, motion, and mobile ergonomics.',
    icon: Sparkles,
  },
  {
    title: 'Modular by design',
    summary: 'Teams should not need to buy every module on day one just to get value from the core platform.',
    icon: Boxes,
  },
  {
    title: 'Trust through visibility',
    summary: 'Drivers, dispatch, and office staff should all be able to see what matters next without digging for it.',
    icon: ShieldCheck,
  },
]

export const partnershipHighlights: MarketingCard[] = [
  {
    title: 'For transport operators with real office load',
    summary: 'Best fit for companies managing recurring shipments, multiple drivers or vehicles, and growing admin overhead.',
    icon: Handshake,
  },
  {
    title: 'Designed for office and field together',
    summary: 'The web app and mobile app are meant to feel like one operating system, not two separate products.',
    icon: ArrowRightLeft,
  },
  {
    title: 'Structured rollout support',
    summary: 'We can help define scope, phase releases, and shape onboarding so adoption feels manageable.',
    icon: Headset,
  },
]

export const serviceAudience: MarketingCard[] = [
  {
    title: 'Dispatch teams',
    summary: 'Need a live view of orders, trips, route events, driver progress, and proof follow-through.',
    icon: Waypoints,
  },
  {
    title: 'Office and finance staff',
    summary: 'Need quotes, invoices, reminders, imports, reporting, and less manual chasing across systems.',
    icon: CreditCard,
  },
  {
    title: 'Management',
    summary: 'Need cleaner reporting, better visibility, and a platform that can expand with the company.',
    icon: ChartNoAxesCombined,
  },
]

export const contactExpectations = [
  'A short reply outlining the best-fit workflow or next conversation.',
  'A product walkthrough focused on your actual office process, not a generic demo script.',
  'A rollout recommendation based on whether you need transport core only or a broader office setup.',
] as const

export const serviceInterestOptions = [
  'Transport operations core',
  'Driver mobile workflow',
  'Quotes and invoicing',
  'Workforce and payroll prep',
  'Imports, reporting, and data migration',
  'Full office rollout',
] as const

export const aboutStats = [
  { label: 'Focus', value: 'Transport ERP' },
  { label: 'Experience direction', value: 'Mobile + office' },
  { label: 'Rollout style', value: 'Modular' },
] as const

export const serviceSpotlights = [
  {
    eyebrow: 'Operations',
    title: 'Keep planning, execution, and follow-through in one shared view.',
    detail:
      'From quote and order creation to trip execution and invoice generation, the platform keeps the whole operational chain visible.',
  },
  {
    eyebrow: 'Mobile',
    title: 'Give drivers an app that feels focused instead of overloaded.',
    detail:
      'Trips, time, checkpoints, and delivery proof are designed to be fast and natural on the phone, even during busy routes.',
  },
  {
    eyebrow: 'Office',
    title: 'Reduce the admin drag that usually sits outside dispatch software.',
    detail:
      'Search, alerts, recurring work, imports, and invoice follow-through help office teams stay inside one operating environment.',
  },
] as const

export const aboutStory = [
  'Lumix is built around a simple idea: transport companies should not need one tool for dispatch, another for office work, and a third for the driver experience just to stay coordinated.',
  'The product direction combines operational clarity, a calmer visual system, and modular rollout so companies can start with the transport core and expand into a fuller office platform over time.',
  'That means better visibility for dispatch, less repetition for office staff, and a more focused experience for drivers in the field.',
] as const
