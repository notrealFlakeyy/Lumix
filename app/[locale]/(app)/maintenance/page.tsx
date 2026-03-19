import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Plus, Settings2, Truck, Wrench } from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireModuleAccess } from '@/lib/auth/require-module-access'

type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue'
type MaintenanceType = 'service' | 'inspection' | 'tyres' | 'brakes' | 'oil_change' | 'adblue' | 'repairs' | 'other'

type MaintenanceRecord = {
  id: string
  vehicleReg: string
  vehicleModel: string
  type: MaintenanceType
  description: string
  scheduledDate: string
  completedDate?: string
  status: MaintenanceStatus
  mileageAtService?: number
  nextDueMileage?: number
  cost?: number
  workshop?: string
  notes?: string
}

const mockRecords: MaintenanceRecord[] = [
  { id: 'm1', vehicleReg: 'ABC-123', vehicleModel: 'Volvo FH 500', type: 'service', description: 'Full 90 000 km service', scheduledDate: '2026-03-28', status: 'scheduled', mileageAtService: 89420, nextDueMileage: 99420, workshop: 'Volvo Trucks Helsinki' },
  { id: 'm2', vehicleReg: 'DEF-456', vehicleModel: 'Scania R 450', type: 'inspection', description: 'Annual roadworthiness inspection', scheduledDate: '2026-03-22', status: 'overdue', workshop: 'Katsastusasema Vantaa', notes: 'Rescheduling needed — driver on sick leave' },
  { id: 'm3', vehicleReg: 'GHI-789', vehicleModel: 'Mercedes Actros 1845', type: 'tyres', description: 'Winter → summer tyre swap', scheduledDate: '2026-04-05', status: 'scheduled', workshop: 'Rengas-Pirinen Oy' },
  { id: 'm4', vehicleReg: 'JKL-012', vehicleModel: 'DAF XF 480', type: 'oil_change', description: 'Engine oil + filter change', scheduledDate: '2026-03-18', completedDate: '2026-03-18', status: 'completed', mileageAtService: 74200, cost: 340, workshop: 'DAF Trucks Tampere' },
  { id: 'm5', vehicleReg: 'ABC-123', vehicleModel: 'Volvo FH 500', type: 'brakes', description: 'Front brake pad replacement', scheduledDate: '2026-03-20', status: 'in_progress', workshop: 'Volvo Trucks Helsinki', cost: 680 },
  { id: 'm6', vehicleReg: 'MNO-345', vehicleModel: 'MAN TGX 18.460', type: 'adblue', description: 'AdBlue system flush & refill', scheduledDate: '2026-03-15', completedDate: '2026-03-15', status: 'completed', cost: 95, workshop: 'MAN Service Turku' },
  { id: 'm7', vehicleReg: 'PQR-678', vehicleModel: 'Iveco S-Way 490', type: 'repairs', description: 'Hydraulic tailgate actuator repair', scheduledDate: '2026-03-25', status: 'scheduled', workshop: 'Iveco Suomi Oy' },
  { id: 'm8', vehicleReg: 'DEF-456', vehicleModel: 'Scania R 450', type: 'other', description: 'GPS tracker firmware update', scheduledDate: '2026-03-19', completedDate: '2026-03-19', status: 'completed', cost: 0, notes: 'Telematics provider remote session' },
]

const typeLabels: Record<MaintenanceType, string> = {
  service: 'Full Service',
  inspection: 'Inspection',
  tyres: 'Tyres',
  brakes: 'Brakes',
  oil_change: 'Oil Change',
  adblue: 'AdBlue',
  repairs: 'Repairs',
  other: 'Other',
}

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const map: Record<MaintenanceStatus, { label: string; icon: React.ReactNode; style: React.CSSProperties }> = {
    scheduled: {
      label: 'Scheduled',
      icon: <CalendarClock className="h-3 w-3" />,
      style: { background: 'rgba(var(--app-accent-2), 0.2)', color: 'rgb(var(--app-contrast))', border: '1px solid rgba(var(--app-accent-2), 0.35)' },
    },
    in_progress: {
      label: 'In Progress',
      icon: <Settings2 className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />,
      style: { background: 'rgba(var(--app-accent), 0.12)', color: 'rgb(var(--app-contrast))', border: '1px solid rgba(var(--app-accent), 0.22)' },
    },
    completed: {
      label: 'Completed',
      icon: <CheckCircle2 className="h-3 w-3" />,
      style: { background: 'rgba(var(--app-muted), 0.1)', color: 'rgb(var(--app-muted))', border: '1px solid rgba(var(--app-muted), 0.2)' },
    },
    overdue: {
      label: 'Overdue',
      icon: <AlertTriangle className="h-3 w-3" />,
      style: { background: 'rgba(var(--app-contrast), 0.08)', color: 'rgb(var(--app-contrast))', border: '1px solid rgba(var(--app-contrast), 0.2)' },
    },
  }
  const { label, icon, style } = map[status]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={style}>
      {icon}
      {label}
    </span>
  )
}

export default async function MaintenancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  await requireModuleAccess(locale, 'maintenance')

  const scheduled = mockRecords.filter((r) => r.status === 'scheduled').length
  const inProgress = mockRecords.filter((r) => r.status === 'in_progress').length
  const overdue = mockRecords.filter((r) => r.status === 'overdue').length
  const totalCostMtd = mockRecords.filter((r) => r.completedDate && r.cost !== undefined).reduce((s, r) => s + (r.cost ?? 0), 0)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fleet Maintenance"
        description="Track service schedules, inspections, repairs, and maintenance costs across the entire fleet. Never miss a service interval."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Truck className="mr-2 h-4 w-4" />
              Fleet view
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Log maintenance
            </Button>
          </>
        }
      />

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Upcoming (30d)', value: String(scheduled), icon: <CalendarClock className="h-5 w-5" />, hint: 'Scheduled services due soon' },
          { label: 'In workshop', value: String(inProgress), icon: <Wrench className="h-5 w-5" />, hint: 'Vehicles currently in service', accent: true },
          { label: 'Overdue', value: String(overdue), icon: <AlertTriangle className="h-5 w-5" />, hint: 'Past scheduled date — act now' },
          { label: 'Cost MTD', value: `€${totalCostMtd.toFixed(0)}`, icon: <Clock className="h-5 w-5" />, hint: 'Maintenance spend this month' },
        ].map((stat) => (
          <Card
            key={stat.label}
            style={
              stat.accent
                ? { background: 'rgba(var(--app-accent), 0.1)', boxShadow: '0 0 0 1px rgba(var(--app-accent), 0.18)' }
                : {}
            }
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgb(var(--app-muted))' }}>
                  {stat.label}
                </CardTitle>
                <span style={{ color: stat.accent ? 'rgb(var(--app-accent))' : 'rgba(var(--app-muted), 0.6)' }}>{stat.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="text-3xl font-bold tracking-tight"
                style={{ color: stat.accent ? 'rgb(var(--app-accent))' : 'rgb(var(--app-contrast))' }}
              >
                {stat.value}
              </div>
              <p className="mt-1.5 text-xs" style={{ color: 'rgba(var(--app-muted), 0.8)' }}>
                {stat.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Maintenance table */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Register</CardTitle>
          <p className="text-sm" style={{ color: 'rgb(var(--app-muted))' }}>
            All scheduled and completed maintenance events across the fleet.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Workshop</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="font-medium text-sm" style={{ color: 'rgb(var(--app-contrast))' }}>
                      {record.vehicleReg}
                    </div>
                    <div className="text-xs" style={{ color: 'rgb(var(--app-muted))' }}>
                      {record.vehicleModel}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className="rounded-lg px-2 py-1 text-xs font-medium"
                      style={{ background: 'rgba(var(--app-muted), 0.1)', color: 'rgb(var(--app-muted))' }}
                    >
                      {typeLabels[record.type]}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="truncate text-sm" style={{ color: 'rgb(var(--app-fg))' }}>
                      {record.description}
                    </div>
                    {record.notes && (
                      <div className="truncate text-xs mt-0.5 italic" style={{ color: 'rgba(var(--app-muted), 0.7)' }}>
                        {record.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm" style={{ color: 'rgb(var(--app-muted))' }}>
                    {record.completedDate ?? record.scheduledDate}
                  </TableCell>
                  <TableCell className="text-sm" style={{ color: 'rgb(var(--app-fg))' }}>
                    {record.workshop ?? '—'}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums text-sm" style={{ color: 'rgb(var(--app-contrast))' }}>
                    {record.cost !== undefined ? `€${record.cost.toFixed(0)}` : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upcoming alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Service Alerts</CardTitle>
          <p className="text-sm" style={{ color: 'rgb(var(--app-muted))' }}>
            Vehicles due for maintenance in the next 14 days or within 1 000 km of their service interval.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockRecords
            .filter((r) => r.status === 'scheduled' || r.status === 'overdue')
            .map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3"
                style={{
                  background: record.status === 'overdue' ? 'rgba(var(--app-contrast), 0.04)' : 'rgba(var(--app-muted), 0.06)',
                  border: `1px solid ${record.status === 'overdue' ? 'rgba(var(--app-contrast), 0.12)' : 'rgba(var(--app-muted), 0.12)'}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(var(--app-accent), 0.12)', color: 'rgb(var(--app-accent))' }}
                  >
                    <Truck className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="font-medium text-sm" style={{ color: 'rgb(var(--app-contrast))' }}>
                      {record.vehicleReg} — {record.vehicleModel}
                    </div>
                    <div className="text-xs" style={{ color: 'rgb(var(--app-muted))' }}>
                      {typeLabels[record.type]}: {record.description}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={record.status} />
                  <div className="mt-1 text-xs tabular-nums" style={{ color: 'rgba(var(--app-muted), 0.7)' }}>
                    {record.scheduledDate}
                  </div>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}
