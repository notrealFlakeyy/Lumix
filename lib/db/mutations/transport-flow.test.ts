import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/shared', async () => {
  return {
    getDbClient: vi.fn(async (client?: unknown) => client),
    getNextDocumentNumber: vi.fn(async (_client, table: 'transport_orders' | 'invoices') =>
      table === 'transport_orders' ? 'ORD-0001' : 'INV-0001',
    ),
    insertAuditLog: vi.fn(async (client: any, input: Record<string, any>) => {
      await client.from('audit_logs').insert(input)
    }),
  }
})

vi.mock('@/lib/auth/get-current-membership', async () => {
  return {
    getCurrentMembership: vi.fn(async () => ({
      membership: null,
      memberships: [],
      user: null,
      supabase: null,
    })),
  }
})

import { createOrder } from '@/lib/db/mutations/orders'
import { completeTrip, createTripFromOrder, startTrip } from '@/lib/db/mutations/trips'
import { createInvoiceFromTrip } from '@/lib/db/mutations/invoices'
import { registerPayment } from '@/lib/db/mutations/payments'

type TableName =
  | 'transport_orders'
  | 'trips'
  | 'invoices'
  | 'invoice_items'
  | 'payments'
  | 'audit_logs'
  | 'company_app_settings'
  | 'customers'

type DatabaseState = Record<TableName, Array<Record<string, any>>>

class FakeQueryBuilder implements PromiseLike<{ data: any; error: Error | null }> {
  private operation: 'select' | 'insert' | 'update' = 'select'
  private filters: Array<(row: Record<string, any>) => boolean> = []
  private orderBy: { column: string; ascending: boolean } | null = null
  private limitCount: number | null = null
  private updatePayload: Record<string, any> | null = null
  private insertPayload: Array<Record<string, any>> = []
  private expectsSingle: 'single' | 'maybeSingle' | null = null

  constructor(
    private readonly client: FakeDbClient,
    private readonly table: TableName,
  ) {}

  select(_columns?: string) {
    if (this.operation === 'select') {
      this.operation = 'select'
    }
    return this
  }

  insert(payload: Record<string, any> | Array<Record<string, any>>) {
    this.operation = 'insert'
    this.insertPayload = (Array.isArray(payload) ? payload : [payload]).map((row) => ({ ...row }))
    return this
  }

  update(payload: Record<string, any>) {
    this.operation = 'update'
    this.updatePayload = { ...payload }
    return this
  }

  eq(column: string, value: any) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  neq(column: string, value: any) {
    this.filters.push((row) => row[column] !== value)
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true }
    return this
  }

  limit(value: number) {
    this.limitCount = value
    return this
  }

  async single() {
    this.expectsSingle = 'single'
    return this.execute()
  }

  async maybeSingle() {
    this.expectsSingle = 'maybeSingle'
    return this.execute()
  }

  then<TResult1 = { data: any; error: Error | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined)
  }

  private async execute() {
    if (this.operation === 'insert') {
      const inserted = this.insertPayload.map((row) => this.client.insertRow(this.table, row))
      return this.finalize(inserted)
    }

    if (this.operation === 'update') {
      const updated = this.client
        .getRows(this.table)
        .filter((row) => this.filters.every((filter) => filter(row)))
        .map((row) => {
          Object.assign(row, this.updatePayload)
          return { ...row }
        })
      return this.finalize(updated)
    }

    let rows = this.client
      .getRows(this.table)
      .filter((row) => this.filters.every((filter) => filter(row)))
      .map((row) => ({ ...row }))

    if (this.orderBy) {
      rows = rows.sort((left, right) => {
        if (left[this.orderBy!.column] === right[this.orderBy!.column]) return 0
        const direction = this.orderBy!.ascending ? 1 : -1
        return left[this.orderBy!.column] > right[this.orderBy!.column] ? direction : -direction
      })
    }

    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount)
    }

    return this.finalize(rows)
  }

  private finalize(rows: Array<Record<string, any>>) {
    if (this.expectsSingle === 'single') {
      if (rows.length < 1) {
        return Promise.resolve({ data: null, error: new Error(`No rows found in ${this.table}`) })
      }

      return Promise.resolve({ data: rows[0], error: null })
    }

    if (this.expectsSingle === 'maybeSingle') {
      return Promise.resolve({ data: rows[0] ?? null, error: null })
    }

    return Promise.resolve({ data: rows, error: null })
  }
}

class FakeDbClient {
  private counters = new Map<TableName, number>()

  constructor(private readonly state: DatabaseState) {}

  from(table: TableName) {
    return new FakeQueryBuilder(this, table)
  }

  getRows(table: TableName) {
    return this.state[table]
  }

  insertRow(table: TableName, row: Record<string, any>) {
    const next = { ...row }
    if (!next.id) {
      next.id = `${table}-${this.nextId(table)}`
    }
    if (table === 'trips' && !next.public_id) {
      next.public_id = `TRIP${String(this.nextId(table)).padStart(4, '0')}`
    }
    if (table === 'invoice_items' && next.line_total === undefined) {
      next.line_total = Number(next.quantity) * Number(next.unit_price)
    }
    if (table === 'payments' && next.created_at === undefined) {
      next.created_at = '2026-03-07T12:00:00.000Z'
    }
    this.state[table].push(next)
    return { ...next }
  }

  private nextId(table: TableName) {
    const next = (this.counters.get(table) ?? 0) + 1
    this.counters.set(table, next)
    return next
  }
}

function createClient(seed?: Partial<DatabaseState>) {
  const state: DatabaseState = {
    transport_orders: [],
    trips: [],
    invoices: [],
    invoice_items: [],
    payments: [],
    audit_logs: [],
    company_app_settings: [],
    customers: [],
    ...seed,
  }

  return {
    client: new FakeDbClient(state) as any,
    state,
  }
}

describe('transport mutation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a transport order with the generated order number', async () => {
    const { client, state } = createClient()

    const order = await createOrder(
      'company-1',
      'user-1',
      {
        customer_id: 'customer-1',
        assigned_vehicle_id: undefined,
        assigned_driver_id: undefined,
        pickup_location: 'Turku',
        delivery_location: 'Helsinki',
        cargo_description: 'Palletized timber',
        scheduled_at: '2026-03-07T08:00:00.000Z',
        status: 'planned',
        notes: 'Morning departure',
      },
      client,
    )

    expect(order.order_number).toBe('ORD-0001')
    expect(state.transport_orders).toHaveLength(1)
    expect(state.transport_orders[0].created_by).toBe('user-1')
    expect(state.audit_logs.at(-1)?.action).toBe('create')
  })

  it('creates and completes a trip from an order while updating order status', async () => {
    const { client, state } = createClient({
      transport_orders: [
        {
          id: 'order-1',
          company_id: 'company-1',
          customer_id: 'customer-1',
          assigned_vehicle_id: 'vehicle-1',
          assigned_driver_id: 'driver-1',
          order_number: 'ORD-0007',
          pickup_location: 'Espoo',
          delivery_location: 'Lahti',
          cargo_description: 'Construction materials',
          scheduled_at: '2026-03-07T09:00:00.000Z',
          status: 'draft',
          notes: 'Call customer 30 min before arrival',
          created_by: 'user-1',
          created_at: '2026-03-07T07:30:00.000Z',
          updated_at: '2026-03-07T07:30:00.000Z',
        },
      ],
      trips: [],
    })

    const trip = await createTripFromOrder('company-1', 'user-1', 'order-1', client)
    expect(state.trips[0].transport_order_id).toBe('order-1')
    expect(state.transport_orders[0].status).toBe('assigned')

    const started = await startTrip('company-1', 'user-1', trip.id, { start_km: 182460, notes: 'Departed terminal' }, client)
    expect(started.status).toBe('started')
    expect(state.transport_orders[0].status).toBe('in_progress')

    const completed = await completeTrip(
      'company-1',
      'user-1',
      trip.id,
      {
        end_km: 182610,
        waiting_time_minutes: 15,
        delivery_confirmation: 'Signed by receiver',
        notes: 'Unload completed on site',
      },
      client,
    )

    expect(completed.status).toBe('completed')
    expect(completed.distance_km).toBe(150)
    expect(state.transport_orders[0].status).toBe('completed')
  })

  it('creates an invoice from a trip and marks it paid after payment registration', async () => {
    const { client, state } = createClient({
      customers: [
        {
          id: 'customer-1',
          company_id: 'company-1',
          name: 'Arctic Timber Solutions',
          business_id: '123',
          vat_number: 'FI123',
          email: 'billing@arctic.test',
          phone: '+358401111111',
          billing_address_line1: 'Timber Road 1',
          billing_address_line2: null,
          billing_postal_code: '00100',
          billing_city: 'Helsinki',
          billing_country: 'FI',
          notes: null,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
        },
      ],
      transport_orders: [
        {
          id: 'order-2',
          company_id: 'company-1',
          customer_id: 'customer-1',
          assigned_vehicle_id: 'vehicle-1',
          assigned_driver_id: 'driver-1',
          order_number: 'ORD-0010',
          pickup_location: 'Tampere',
          delivery_location: 'Oulu',
          cargo_description: 'Retail cargo',
          scheduled_at: '2026-03-06T09:00:00.000Z',
          status: 'completed',
          notes: 'Priority delivery',
          created_by: 'user-1',
          created_at: '2026-03-06T07:00:00.000Z',
          updated_at: '2026-03-06T07:00:00.000Z',
        },
      ],
      trips: [
        {
          id: 'trip-1',
          public_id: 'TRIP0001',
          company_id: 'company-1',
          transport_order_id: 'order-2',
          customer_id: 'customer-1',
          vehicle_id: 'vehicle-1',
          driver_id: 'driver-1',
          start_time: '2026-03-06T09:00:00.000Z',
          end_time: '2026-03-06T13:30:00.000Z',
          start_km: '1000',
          end_km: '1120',
          distance_km: '120',
          waiting_time_minutes: 30,
          notes: 'Completed successfully',
          delivery_confirmation: 'Signed',
          status: 'completed',
          created_by: 'user-1',
          created_at: '2026-03-06T08:30:00.000Z',
          updated_at: '2026-03-06T13:30:00.000Z',
        },
      ],
    })

    const invoice = await createInvoiceFromTrip('company-1', 'user-1', 'trip-1', client)

    expect(invoice.invoice_number).toBe('INV-0001')
    expect(state.invoice_items).toHaveLength(2)
    expect(state.trips[0].status).toBe('invoiced')
    expect(state.transport_orders[0].status).toBe('invoiced')
    expect(state.invoices[0].status).toBe('draft')

    const total = Number(state.invoices[0].total)
    await registerPayment(
      'company-1',
      'user-1',
      {
        invoice_id: invoice.id,
        payment_date: '2026-03-07',
        amount: total,
        payment_method: 'Bank transfer',
        reference: 'RF123456',
      },
      client,
    )

    expect(state.payments).toHaveLength(1)
    expect(state.invoices[0].status).toBe('paid')
  })

  it('rejects trip completion when the odometer would go backwards', async () => {
    const { client } = createClient({
      trips: [
        {
          id: 'trip-2',
          public_id: 'TRIP0002',
          company_id: 'company-1',
          transport_order_id: null,
          customer_id: 'customer-1',
          vehicle_id: 'vehicle-1',
          driver_id: 'driver-1',
          start_time: '2026-03-07T10:00:00.000Z',
          end_time: null,
          start_km: '800',
          end_km: null,
          distance_km: null,
          waiting_time_minutes: 0,
          notes: null,
          delivery_confirmation: null,
          status: 'started',
          created_by: 'user-1',
          created_at: '2026-03-07T10:00:00.000Z',
          updated_at: '2026-03-07T10:00:00.000Z',
        },
      ],
    })

    await expect(
      completeTrip(
        'company-1',
        'user-1',
        'trip-2',
        {
          end_km: 750,
        },
        client,
      ),
    ).rejects.toThrow('Trip distance cannot be negative.')
  })
})
