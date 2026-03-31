export default function StatCard({ title, value, color = "bg-white" }) {
  return (
    <div className={`${color} rounded-2xl shadow p-5`}>
      <p className="text-sm text-gray-600">{title}</p>
      <h3 className="text-3xl font-bold mt-2">{value}</h3>
    </div>
  );
}