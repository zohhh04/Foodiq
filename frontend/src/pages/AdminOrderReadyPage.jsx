import AdminOrderList from '../components/AdminOrderList.jsx';

function AdminOrderReadyPage() {
  return (
    <div>
      <h1>Order Ready</h1>
      <p className="live-hint">Orders ready for pickup at the counter.</p>
      <AdminOrderList
        status="ready"
        emptyText="No orders are ready right now."
        allowActions
        allowCancel
      />
    </div>
  );
}

export default AdminOrderReadyPage;
