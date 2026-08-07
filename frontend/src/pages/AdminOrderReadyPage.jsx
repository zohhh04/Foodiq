import AdminOrderList from '../components/AdminOrderList.jsx';

function AdminOrderReadyPage() {
  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-page-head-icon">🛎️</div>
        <div>
          <h1>Order Ready</h1>
          <p className="live-hint">Orders ready for pickup at the counter.</p>
        </div>
      </div>
      <AdminOrderList
        status="ready"
        emptyTitle="No orders ready"
        emptyIcon="🛎️"
        emptyText="Orders you mark as ready will land here for pickup."
        emptyHint="Stand by — ready orders pop in here the moment you mark them."
        allowActions
        allowCancel
      />
    </div>
  );
}

export default AdminOrderReadyPage;
