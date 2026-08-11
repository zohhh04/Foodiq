import AdminOrderList from '../components/AdminOrderList.jsx';

function AdminOrderCompletedPage() {
  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-page-head-icon">✅</div>
        <div>
          <h1>Order Completed</h1>
          <p className="live-hint">Orders that students have picked up and rated. Includes their stars &amp; feedback.</p>
        </div>
      </div>
      <AdminOrderList
        status="completed"
        emptyTitle="No completed orders"
        emptyIcon="✅"
        emptyText="Rated orders will be recorded here for your records."
        emptyHint="Once a student picks up and rates their order, it shows up here with the rating stars and feedback."
        allowActions={false}
      />
    </div>
  );
}

export default AdminOrderCompletedPage;
