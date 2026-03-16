import { publicEnv } from '@/lib/env/public'

type JsonSchema = Record<string, unknown>

function stringSchema(format?: string, nullable = false): JsonSchema {
  return nullable ? { anyOf: [{ type: 'string', ...(format ? { format } : {}) }, { type: 'null' }] } : { type: 'string', ...(format ? { format } : {}) }
}

function numberLikeSchema(nullable = false): JsonSchema {
  const base = { oneOf: [{ type: 'number' }, { type: 'string' }] }
  return nullable ? { anyOf: [base, { type: 'null' }] } : base
}

export function getMobileOpenApiSpec() {
  const baseUrl = publicEnv.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const components = {
    securitySchemes: {
      SupabaseSessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'sb-access-token',
        description:
          'Web/mobile browser contract using the authenticated Supabase SSR session cookie.',
      },
      SupabaseBearerToken: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Native-ready option. Use a Supabase access token in the Authorization header: Bearer <token>.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
        },
      },
      Company: {
        type: 'object',
        required: ['id', 'name', 'timezone', 'country'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          timezone: { type: 'string' },
          country: { type: 'string' },
        },
        additionalProperties: true,
      },
      Membership: {
        type: 'object',
        required: ['company_id', 'role', 'enabled_modules', 'branch_ids', 'has_restricted_branch_access', 'company'],
        properties: {
          company_id: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['owner', 'admin', 'dispatcher', 'accountant', 'driver', 'viewer'] },
          enabled_modules: { type: 'array', items: { type: 'string' } },
          branch_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
          has_restricted_branch_access: { type: 'boolean' },
          company: { $ref: '#/components/schemas/Company' },
        },
      },
      Driver: {
        type: 'object',
        required: ['id', 'full_name'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          public_id: stringSchema(undefined, true),
          route_id: { type: 'string' },
          auth_user_id: stringSchema('uuid', true),
          full_name: { type: 'string' },
          email: stringSchema(undefined, true),
          phone: stringSchema(undefined, true),
          is_active: { type: 'boolean' },
        },
        additionalProperties: true,
      },
      Trip: {
        type: 'object',
        required: ['id', 'public_id', 'company_id', 'customer_id', 'status', 'waiting_time_minutes', 'created_at', 'updated_at'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          public_id: { type: 'string' },
          route_id: { type: 'string' },
          company_id: { type: 'string', format: 'uuid' },
          customer_id: { type: 'string', format: 'uuid' },
          vehicle_id: stringSchema('uuid', true),
          driver_id: stringSchema('uuid', true),
          transport_order_id: stringSchema('uuid', true),
          branch_id: stringSchema('uuid', true),
          status: { type: 'string', enum: ['planned', 'started', 'completed', 'invoiced'] },
          start_time: stringSchema(undefined, true),
          end_time: stringSchema(undefined, true),
          start_km: numberLikeSchema(true),
          end_km: numberLikeSchema(true),
          distance_km: numberLikeSchema(true),
          waiting_time_minutes: numberLikeSchema(false),
          delivery_confirmation: stringSchema(undefined, true),
          delivery_recipient_name: stringSchema(undefined, true),
          delivery_received_at: stringSchema(undefined, true),
          customer_name: { type: 'string' },
          vehicle_name: { type: 'string' },
          order_number: stringSchema(undefined, true),
          pickup_location: stringSchema(undefined, true),
          delivery_location: stringSchema(undefined, true),
          scheduled_at: stringSchema(undefined, true),
          order_status: stringSchema(undefined, true),
          invoice_number: stringSchema(undefined, true),
          invoice_status: stringSchema(undefined, true),
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
        additionalProperties: true,
      },
      Document: {
        type: 'object',
        required: ['id', 'company_id', 'file_name', 'file_path', 'created_at'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          company_id: { type: 'string', format: 'uuid' },
          branch_id: stringSchema('uuid', true),
          related_type: stringSchema(undefined, true),
          related_id: stringSchema('uuid', true),
          file_name: { type: 'string' },
          file_path: { type: 'string' },
          mime_type: stringSchema(undefined, true),
          uploaded_by: stringSchema('uuid', true),
          created_at: { type: 'string', format: 'date-time' },
          access_url: stringSchema('uri', true),
        },
        additionalProperties: true,
      },
      Checkpoint: {
        type: 'object',
        required: ['id', 'company_id', 'trip_id', 'checkpoint_type', 'latitude', 'longitude', 'captured_at'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          company_id: { type: 'string', format: 'uuid' },
          trip_id: { type: 'string', format: 'uuid' },
          branch_id: stringSchema('uuid', true),
          checkpoint_type: { type: 'string', enum: ['arrived_pickup', 'departed_pickup', 'arrived_delivery', 'delivered'] },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          accuracy_meters: numberLikeSchema(true),
          notes: stringSchema(undefined, true),
          captured_at: { type: 'string', format: 'date-time' },
        },
        additionalProperties: true,
      },
      WorkforceEmployee: {
        type: 'object',
        required: ['id', 'company_id', 'full_name', 'is_active'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          company_id: { type: 'string', format: 'uuid' },
          branch_id: stringSchema('uuid', true),
          auth_user_id: stringSchema('uuid', true),
          full_name: { type: 'string' },
          email: stringSchema(undefined, true),
          is_active: { type: 'boolean' },
        },
        additionalProperties: true,
      },
      TimeEntry: {
        type: 'object',
        required: ['id', 'company_id', 'employee_id', 'status', 'work_date', 'start_time', 'regular_minutes', 'overtime_minutes'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          company_id: { type: 'string', format: 'uuid' },
          employee_id: { type: 'string', format: 'uuid' },
          branch_id: stringSchema('uuid', true),
          status: { type: 'string', enum: ['open', 'submitted', 'approved', 'exported'] },
          work_date: { type: 'string' },
          start_time: { type: 'string', format: 'date-time' },
          end_time: stringSchema(undefined, true),
          regular_minutes: numberLikeSchema(false),
          overtime_minutes: numberLikeSchema(false),
          break_minutes: numberLikeSchema(false),
          notes: stringSchema(undefined, true),
        },
        additionalProperties: true,
      },
      TimeSummary: {
        type: 'object',
        required: ['employee', 'openEntry', 'todaysMinutes', 'submittedMinutes', 'approvedWeekMinutes', 'recentEntries'],
        properties: {
          employee: { anyOf: [{ $ref: '#/components/schemas/WorkforceEmployee' }, { type: 'null' }] },
          openEntry: { anyOf: [{ $ref: '#/components/schemas/TimeEntry' }, { type: 'null' }] },
          todaysMinutes: { type: 'number' },
          submittedMinutes: { type: 'number' },
          approvedWeekMinutes: { type: 'number' },
          recentEntries: { type: 'array', items: { $ref: '#/components/schemas/TimeEntry' } },
        },
      },
      MeResponse: {
        type: 'object',
        required: ['ok', 'membership', 'active_driver', 'matched_driver_id', 'preview_driver_id', 'is_preview_mode', 'workforce_employee', 'available_preview_drivers'],
        properties: {
          ok: { type: 'boolean', const: true },
          membership: { $ref: '#/components/schemas/Membership' },
          active_driver: { $ref: '#/components/schemas/Driver' },
          matched_driver_id: stringSchema(undefined, true),
          preview_driver_id: stringSchema(undefined, true),
          is_preview_mode: { type: 'boolean' },
          workforce_employee: { anyOf: [{ $ref: '#/components/schemas/WorkforceEmployee' }, { type: 'null' }] },
          available_preview_drivers: { type: 'array', items: { $ref: '#/components/schemas/Driver' } },
        },
      },
      HomeResponse: {
        type: 'object',
        required: ['ok', 'active_driver', 'preview_driver_id', 'stats', 'primary_trip', 'priority_items', 'timeline_items'],
        properties: {
          ok: { type: 'boolean', const: true },
          active_driver: { $ref: '#/components/schemas/Driver' },
          preview_driver_id: stringSchema(undefined, true),
          stats: {
            type: 'object',
            required: ['live_trips', 'planned_trips', 'document_count', 'todays_minutes', 'submitted_minutes', 'approved_week_minutes'],
            properties: {
              live_trips: { type: 'number' },
              planned_trips: { type: 'number' },
              document_count: { type: 'number' },
              todays_minutes: numberLikeSchema(false),
              submitted_minutes: numberLikeSchema(false),
              approved_week_minutes: numberLikeSchema(false),
            },
          },
          primary_trip: { anyOf: [{ $ref: '#/components/schemas/Trip' }, { type: 'null' }] },
          priority_items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'type', 'title', 'detail'],
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                title: { type: 'string' },
                detail: { type: 'string' },
                href: { type: 'string' },
                trip_id: { type: 'string' },
              },
              additionalProperties: true,
            },
          },
          timeline_items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'time', 'title', 'detail', 'kind'],
              properties: {
                id: { type: 'string' },
                time: { type: 'string' },
                title: { type: 'string' },
                detail: { type: 'string' },
                kind: { type: 'string', enum: ['shift', 'trip'] },
                trip_id: { type: 'string' },
                status: { type: 'string' },
              },
              additionalProperties: true,
            },
          },
        },
      },
      TripsResponse: {
        type: 'object',
        required: ['ok', 'active_driver', 'trips'],
        properties: {
          ok: { type: 'boolean', const: true },
          active_driver: { $ref: '#/components/schemas/Driver' },
          trips: { type: 'array', items: { $ref: '#/components/schemas/Trip' } },
        },
      },
      TripDetailResponse: {
        type: 'object',
        required: ['ok', 'trip', 'detail', 'documents', 'checkpoints', 'time_summary'],
        properties: {
          ok: { type: 'boolean', const: true },
          trip: { $ref: '#/components/schemas/Trip' },
          detail: { type: 'object', additionalProperties: true },
          documents: { type: 'array', items: { $ref: '#/components/schemas/Document' } },
          checkpoints: { type: 'array', items: { $ref: '#/components/schemas/Checkpoint' } },
          time_summary: { anyOf: [{ $ref: '#/components/schemas/TimeSummary' }, { type: 'null' }] },
        },
      },
      DocumentsResponse: {
        type: 'object',
        required: ['ok', 'documents'],
        properties: {
          ok: { type: 'boolean', const: true },
          documents: { type: 'array', items: { $ref: '#/components/schemas/Document' } },
        },
      },
      TimeSummaryResponse: {
        type: 'object',
        required: ['ok', 'summary'],
        properties: {
          ok: { type: 'boolean', const: true },
          summary: { $ref: '#/components/schemas/TimeSummary' },
        },
      },
      TripMutationResponse: {
        type: 'object',
        required: ['ok', 'trip'],
        properties: {
          ok: { type: 'boolean', const: true },
          trip: { $ref: '#/components/schemas/Trip' },
        },
      },
      CheckpointMutationResponse: {
        type: 'object',
        required: ['ok', 'checkpoint'],
        properties: {
          ok: { type: 'boolean', const: true },
          checkpoint: { $ref: '#/components/schemas/Checkpoint' },
        },
      },
      TimeEntryMutationResponse: {
        type: 'object',
        required: ['ok', 'entry'],
        properties: {
          ok: { type: 'boolean', const: true },
          entry: { $ref: '#/components/schemas/TimeEntry' },
        },
      },
      StartTripRequest: {
        type: 'object',
        properties: {
          start_km: numberLikeSchema(true),
          notes: stringSchema(undefined, true),
        },
      },
      CompleteTripRequest: {
        type: 'object',
        properties: {
          end_km: numberLikeSchema(true),
          waiting_time_minutes: { type: 'integer', minimum: 0 },
          delivery_confirmation: stringSchema(undefined, true),
          notes: stringSchema(undefined, true),
        },
      },
      CheckpointRequest: {
        type: 'object',
        required: ['checkpoint_type', 'latitude', 'longitude'],
        properties: {
          checkpoint_type: { type: 'string', enum: ['arrived_pickup', 'departed_pickup', 'arrived_delivery', 'delivered'] },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          accuracy_meters: numberLikeSchema(true),
          notes: stringSchema(undefined, true),
        },
      },
      DeliveryProofRequest: {
        type: 'object',
        required: ['delivery_recipient_name', 'delivery_confirmation', 'signature_data_url'],
        properties: {
          delivery_recipient_name: { type: 'string', minLength: 1 },
          delivery_confirmation: { type: 'string', minLength: 1 },
          signature_data_url: { type: 'string', pattern: '^data:image/png;base64,' },
        },
      },
      ClockOutRequest: {
        type: 'object',
        properties: {
          break_minutes: { type: 'integer', minimum: 0 },
          notes: stringSchema(undefined, true),
        },
      },
    },
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Lumix Mobile API',
      version: '1.0.0',
      description:
        'Versioned mobile contract for the driver workflow. This is the forward-looking integration surface for a future native app.',
    },
    servers: [
      {
        url: baseUrl,
      },
    ],
    tags: [
      { name: 'Mobile' },
      { name: 'Trips' },
      { name: 'Shift' },
      { name: 'Documents' },
    ],
    security: [{ SupabaseBearerToken: [] }, { SupabaseSessionCookie: [] }],
    components,
    paths: {
      '/api/mobile/v1/me': {
        get: {
          tags: ['Mobile'],
          summary: 'Get current mobile driver context',
          parameters: [
            {
              in: 'query',
              name: 'driver',
              schema: { type: 'string' },
              required: false,
              description: 'Preview driver route id for owner/admin preview mode.',
            },
            {
              in: 'header',
              name: 'x-company-id',
              schema: { type: 'string', format: 'uuid' },
              required: false,
              description: 'Optional active company selector for users with multiple company memberships.',
            },
          ],
          responses: {
            '200': { description: 'Mobile context', content: { 'application/json': { schema: { $ref: '#/components/schemas/MeResponse' } } } },
            '401': { description: 'Unauthenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/mobile/v1/home': {
        get: {
          tags: ['Mobile'],
          summary: 'Get driver mobile home summary',
          parameters: [
            {
              in: 'query',
              name: 'driver',
              schema: { type: 'string' },
              required: false,
            },
            {
              in: 'header',
              name: 'x-company-id',
              schema: { type: 'string', format: 'uuid' },
              required: false,
            },
          ],
          responses: {
            '200': { description: 'Driver home summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/HomeResponse' } } } },
          },
        },
      },
      '/api/mobile/v1/trips': {
        get: {
          tags: ['Trips'],
          summary: 'List driver trips',
          parameters: [
            {
              in: 'query',
              name: 'driver',
              schema: { type: 'string' },
              required: false,
            },
            {
              in: 'header',
              name: 'x-company-id',
              schema: { type: 'string', format: 'uuid' },
              required: false,
            },
          ],
          responses: {
            '200': { description: 'Trip list', content: { 'application/json': { schema: { $ref: '#/components/schemas/TripsResponse' } } } },
          },
        },
      },
      '/api/mobile/v1/trips/{id}': {
        get: {
          tags: ['Trips'],
          summary: 'Get driver trip detail',
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
            { in: 'query', name: 'driver', required: false, schema: { type: 'string' } },
            { in: 'header', name: 'x-company-id', required: false, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Trip detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/TripDetailResponse' } } } },
            '404': { description: 'Trip not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/mobile/v1/trips/{id}/start': {
        post: {
          tags: ['Trips'],
          summary: 'Start a trip',
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
            { in: 'header', name: 'x-company-id', required: false, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/StartTripRequest' } } },
          },
          responses: {
            '200': { description: 'Trip started', content: { 'application/json': { schema: { $ref: '#/components/schemas/TripMutationResponse' } } } },
          },
        },
      },
      '/api/mobile/v1/trips/{id}/complete': {
        post: {
          tags: ['Trips'],
          summary: 'Complete a trip',
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
            { in: 'header', name: 'x-company-id', required: false, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CompleteTripRequest' } } },
          },
          responses: {
            '200': { description: 'Trip completed', content: { 'application/json': { schema: { $ref: '#/components/schemas/TripMutationResponse' } } } },
          },
        },
      },
      '/api/mobile/v1/trips/{id}/checkpoint': {
        post: {
          tags: ['Trips'],
          summary: 'Capture trip checkpoint',
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
            { in: 'header', name: 'x-company-id', required: false, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckpointRequest' } } },
          },
          responses: {
            '200': { description: 'Checkpoint captured', content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckpointMutationResponse' } } } },
          },
        },
      },
      '/api/mobile/v1/trips/{id}/delivery-proof': {
        post: {
          tags: ['Trips', 'Documents'],
          summary: 'Save proof of delivery',
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
            { in: 'header', name: 'x-company-id', required: false, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DeliveryProofRequest' } } },
          },
          responses: {
            '200': { description: 'Delivery proof saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/TripMutationResponse' } } } },
          },
        },
      },
      '/api/mobile/v1/documents': {
        get: {
          tags: ['Documents'],
          summary: 'List driver documents',
          parameters: [
            {
              in: 'query',
              name: 'driver',
              schema: { type: 'string' },
              required: false,
            },
            {
              in: 'header',
              name: 'x-company-id',
              schema: { type: 'string', format: 'uuid' },
              required: false,
            },
          ],
          responses: {
            '200': { description: 'Document feed', content: { 'application/json': { schema: { $ref: '#/components/schemas/DocumentsResponse' } } } },
          },
        },
      },
      '/api/mobile/v1/time/summary': {
        get: {
          tags: ['Shift'],
          summary: 'Get driver time summary',
          parameters: [
            {
              in: 'query',
              name: 'driver',
              schema: { type: 'string' },
              required: false,
            },
            {
              in: 'header',
              name: 'x-company-id',
              schema: { type: 'string', format: 'uuid' },
              required: false,
            },
          ],
          responses: {
            '200': { description: 'Time summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeSummaryResponse' } } } },
          },
        },
      },
      '/api/mobile/v1/shift/clock-in': {
        post: {
          tags: ['Shift'],
          summary: 'Clock in shift',
          parameters: [{ in: 'header', name: 'x-company-id', required: false, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'Shift clocked in', content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeEntryMutationResponse' } } } },
          },
        },
      },
      '/api/mobile/v1/shift/clock-out': {
        post: {
          tags: ['Shift'],
          summary: 'Clock out shift',
          parameters: [{ in: 'header', name: 'x-company-id', required: false, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ClockOutRequest' } } },
          },
          responses: {
            '200': { description: 'Shift clocked out', content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeEntryMutationResponse' } } } },
          },
        },
      },
    },
  }
}
