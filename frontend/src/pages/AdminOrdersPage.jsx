import AdminOrderList from '../components/AdminOrderList.jsx';

function AdminOrdersPage() {
  return (
    <div>
      <h1>All Orders</h1>
      <p className="live-hint">Live: statuses update automatically. Advance orders as they move along.</p>
      <AdminOrderList emptyText="No orders placed yet." />
    </div>
  );
}

export default AdminOrdersPage;
