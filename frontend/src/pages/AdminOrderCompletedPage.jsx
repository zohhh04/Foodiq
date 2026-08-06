import AdminOrderList from '../components/AdminOrderList.jsx';

function AdminOrderCompletedPage() {
  return (
    <div>
      <h1>Order Completed</h1>
      <p className="live-hint">Orders that have been picked up and completed.</p>
      <AdminOrderList status="completed" emptyText="No completed orders yet." allowActions={false} />
    </div>
  );
}

export default AdminOrderCompletedPage;
