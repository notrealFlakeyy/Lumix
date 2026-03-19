import { AlertCircle, CheckCircle2, Circle, Clock, Flag, Grip, Plus, SlidersHorizontal } from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireModuleAccess } from '@/lib/auth/require-module-access'

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

type Task = {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignee: string
  dueDate?: string
  tags?: string[]
}

// Mock tasks — replace with Supabase queries once tasks table exists
const mockTasks: Task[] = [
  { id: 't1', title: 'Renew vehicle insurance for fleet batch B', status: 'todo', priority: 'urgent', assignee: 'Anna H.', dueDate: '2026-03-25', tags: ['fleet', 'compliance'] },
  { id: 't2', title: 'Onboard new driver Petri Mäkinen', status: 'todo', priority: 'high', assignee: 'Sari L.', dueDate: '2026-03-28', tags: ['hr'] },
  { id: 't3', title: 'Update customer rate card — Kesko account', status: 'todo', priority: 'medium', assignee: 'Matti V.', dueDate: '2026-04-01', tags: ['sales'] },
  { id: 't4', title: 'Q1 fuel cost review and budget report', status: 'in_progress', priority: 'high', assignee: 'Anna H.', dueDate: '2026-03-22', tags: ['finance'] },
  { id: 't5', title: 'Schedule tyre rotation for truck FI-432', status: 'in_progress', priority: 'medium', assignee: 'Juhani K.', dueDate: '2026-03-24', tags: ['maintenance'] },
  { id: 't6', title: 'Reconcile March purchase invoices', status: 'in_progress', priority: 'high', assignee: 'Sari L.', dueDate: '2026-03-31', tags: ['finance'] },
  { id: 't7', title: 'Review and approve Feb payroll export', status: 'review', priority: 'urgent', assignee: 'Matti V.', dueDate: '2026-03-20', tags: ['payroll'] },
  { id: 't8', title: 'Send overdue invoice reminders — batch', status: 'review', priority: 'high', assignee: 'Anna H.', tags: ['finance'] },
  { id: 't9', title: 'Archive 2025 transport orders', status: 'done', priority: 'low', assignee: 'Juhani K.', tags: ['admin'] },
  { id: 't10', title: 'Update driver handbook 2026 edition', status: 'done', priority: 'medium', assignee: 'Sari L.', tags: ['hr'] },
  { id: 't11', title: 'Set up new depot branch in Oulu', status: 'done', priority: 'high', assignee: 'Matti V.', tags: ['operations'] },
]

const columns: { key: TaskStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'todo', label: 'To Do', icon: <Circle className="h-4 w-4" /> },
  { key: 'in_progress', label: 'In Progress', icon: <Clock className="h-4 w-4" /> },
  { key: 'review', label: 'In Review', icon: <AlertCircle className="h-4 w-4" /> },
  { key: 'done', label: 'Done', icon: <CheckCircle2 className="h-4 w-4" /> },
]

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'rgba(var(--app-muted), 0.5)' },
  medium: { label: 'Medium', color: 'rgba(var(--app-accent-2), 0.9)' },
  high: { label: 'High', color: 'rgb(var(--app-accent))' },
  urgent: { label: 'Urgent', color: 'rgb(var(--app-contrast))' },
}

function TaskCard({ task }: { task: Task }) {
  const priority = priorityConfig[task.priority]
  const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date()

  return (
    <div
      className="rounded-2xl p-4 transition-all duration-150 hover:-translate-y-0.5"
      style={{
        background: 'rgb(var(--app-surface))',
        border: '1px solid rgba(var(--app-muted), 0.14)',
        boxShadow: '0 2px 8px rgba(95,73,52,0.06)',
        cursor: 'grab',
      }}
    >
      {/* Priority flag + tags */}
      <div className="mb-2.5 flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: priority.color }}>
          <Flag className="h-2.5 w-2.5" />
          {priority.label}
        </span>
        {task.tags?.map((tag) => (
          <span
            key={tag}
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: 'rgba(var(--app-muted), 0.12)', color: 'rgb(var(--app-muted))' }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Title */}
      <p className="text-sm font-medium leading-snug" style={{ color: 'rgb(var(--app-contrast))' }}>
        {task.title}
      </p>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between gap-2">
        {/* Assignee avatar */}
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
          style={{ background: 'rgba(var(--app-accent), 0.15)', color: 'rgb(var(--app-accent))' }}
          title={task.assignee}
        >
          {task.assignee.split(' ').map((n) => n[0]).join('')}
        </span>

        {/* Due date */}
        {task.dueDate && (
          <span
            className="text-[11px] font-medium tabular-nums"
            style={{ color: isOverdue ? 'rgb(var(--app-accent))' : 'rgba(var(--app-muted), 0.8)' }}
          >
            {isOverdue ? '⚠ ' : ''}
            {task.dueDate}
          </span>
        )}
      </div>
    </div>
  )
}

export default async function TasksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  await requireModuleAccess(locale, 'tasks')

  const tasksByStatus = (status: TaskStatus) => mockTasks.filter((t) => t.status === status)

  const totalOpen = mockTasks.filter((t) => t.status !== 'done').length
  const urgent = mockTasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length
  const doneCount = tasksByStatus('done').length
  const overdue = mockTasks.filter((t) => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date()).length

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tasks"
        description="Manage internal work items, compliance to-dos, and team assignments — all linked to your operations context."
        actions={
          <>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New task
            </Button>
          </>
        }
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Open tasks', value: String(totalOpen), hint: 'Not yet completed' },
          { label: 'Urgent', value: String(urgent), hint: 'Need immediate attention', accent: true },
          { label: 'Overdue', value: String(overdue), hint: 'Past their due date' },
          { label: 'Completed', value: String(doneCount), hint: 'This period' },
        ].map((s) => (
          <Card
            key={s.label}
            style={
              s.accent
                ? { background: 'rgba(var(--app-accent), 0.1)', boxShadow: '0 0 0 1px rgba(var(--app-accent), 0.18)' }
                : {}
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgb(var(--app-muted))' }}>
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="text-3xl font-bold tracking-tight"
                style={{ color: s.accent ? 'rgb(var(--app-accent))' : 'rgb(var(--app-contrast))' }}
              >
                {s.value}
              </div>
              <p className="mt-1.5 text-xs" style={{ color: 'rgba(var(--app-muted), 0.8)' }}>
                {s.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban board */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const colTasks = tasksByStatus(col.key)
          return (
            <div key={col.key} className="flex flex-col gap-3">
              {/* Column header */}
              <div
                className="flex items-center justify-between rounded-2xl px-4 py-3"
                style={{ background: 'rgba(var(--app-muted), 0.08)' }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: 'rgb(var(--app-muted))' }}>{col.icon}</span>
                  <span className="text-sm font-semibold" style={{ color: 'rgb(var(--app-contrast))' }}>
                    {col.label}
                  </span>
                </div>
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(var(--app-muted), 0.15)', color: 'rgb(var(--app-muted))' }}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Task cards */}
              {colTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}

              {/* Add card */}
              <button
                className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm transition-all duration-150 hover:opacity-80"
                style={{
                  border: '1px dashed rgba(var(--app-muted), 0.25)',
                  color: 'rgba(var(--app-muted), 0.7)',
                  background: 'transparent',
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add task
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
