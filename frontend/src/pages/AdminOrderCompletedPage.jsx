import AdminOrderList from '../components/AdminOrderList.jsx';

function AdminOrderCompletedPage() {
  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-page-head-icon">✅</div>
        <div>
          <h1>Order Completed</h1>
          <p className="live-hint">Orders that have been picked up and completed.</p>
        </div>
      </div>
      <AdminOrderList
        status="completed"
        emptyTitle="No completed orders"
        emptyIcon="✅"
        emptyText="Picked-up orders will be recorded here for your records."
        emptyHint="Once a student picks up their order, it shows up on this page."
        allowActions={false}
      />
    </div>
  );
}

export default AdminOrderCompletedPage;
