import { useEffect, useState } from 'react';
import AdminDataTable from '../../components/admin/AdminDataTable.jsx';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge.jsx';
import { adminService } from '../../services/adminService';
import { PageTitle } from './AdminProductsPage.jsx';

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load(search = '') {
    setLoading(true);
    const data = await adminService.inventory({ search, limit: 100 });
    setInventory(data.inventory || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function adjust(row, delta) {
    await adminService.updateInventory(row.id, { delta });
    load();
  }

  return (
    <section className="grid gap-6">
      <PageTitle eyebrow="Inventory" title="Stock control" />
      <AdminDataTable
        title="Inventory"
        description="Monitor low stock, out-of-stock items and update quantities."
        rows={inventory}
        loading={loading}
        onSearch={load}
        columns={[
          { key: 'name', label: 'Product' },
          { key: 'category', label: 'Category' },
          { key: 'stock', label: 'Stock' },
          { key: 'status', label: 'Status', render: (row) => <AdminStatusBadge>{row.stock <= 0 ? 'Out of Stock' : row.stock <= 10 ? 'Low Stock' : row.status}</AdminStatusBadge> }
        ]}
        actions={(row) => <div className="flex gap-2"><button className="admin-action" onClick={() => adjust(row, -1)}>-1</button><button className="admin-action" onClick={() => adjust(row, 1)}>+1</button><button className="admin-action" onClick={() => adjust(row, 10)}>+10</button></div>}
      />
    </section>
  );
}
