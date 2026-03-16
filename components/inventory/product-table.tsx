import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/navigation'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDateTime } from '@/lib/utils/dates'
import { toDisplayNumber } from '@/lib/utils/numbers'

export function InventoryProductTable({
  products,
}: {
  products: Array<{
    id: string
    branch_name: string
    sku: string
    name: string
    category: string | null
    unit: string
    on_hand: number
    reorder_level: string | number
    stock_value: number
    last_movement_at: string | null
    is_active: boolean
  }>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>On hand</TableHead>
          <TableHead>Reorder</TableHead>
          <TableHead>Stock value</TableHead>
          <TableHead>Last movement</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">
              <Link href={`/inventory/products/${product.id}`} className="text-slate-950 hover:underline">
                {product.sku}
              </Link>
            </TableCell>
            <TableCell>{product.name}</TableCell>
            <TableCell>{product.branch_name}</TableCell>
            <TableCell>{product.category ?? '-'}</TableCell>
            <TableCell>{toDisplayNumber(product.on_hand, 2)} {product.unit}</TableCell>
            <TableCell>{toDisplayNumber(product.reorder_level, 2)} {product.unit}</TableCell>
            <TableCell>{formatCurrency(product.stock_value)}</TableCell>
            <TableCell>{product.last_movement_at ? formatDateTime(product.last_movement_at) : '-'}</TableCell>
            <TableCell>
              {product.is_active ? (
                <Badge variant={product.on_hand <= Number(product.reorder_level) ? 'warning' : 'success'}>
                  {product.on_hand <= Number(product.reorder_level) ? 'Low stock' : 'Active'}
                </Badge>
              ) : (
                <Badge variant="default">Inactive</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
