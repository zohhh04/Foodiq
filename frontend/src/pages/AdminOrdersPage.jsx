import AdminOrderList from '../components/AdminOrderList.jsx';

function AdminOrdersPage() {
  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-page-head-icon">📋</div>
        <div>
          <h1>All Orders</h1>
          <p className="live-hint">Live: mark orders ready to notify the student and move them to Order Ready.</p>
        </div>
      </div>
      <AdminOrderList
        readyOnly
        emptyTitle="All caught up!"
        emptyIcon="📋"
        emptyText="No pending orders right now."
        emptyHint="New orders will appear here as students place them."
      />
    </div>
  );
}

export default AdminOrdersPage;
