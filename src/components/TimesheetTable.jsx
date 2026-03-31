export default function TimesheetTable({ data = [], admin = false }) {
  return (
    <div className="bg-white rounded-2xl shadow overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-200">
          <tr>
            {admin && <th className="p-4 text-left">Employee</th>}
            <th className="p-4 text-left">Date</th>
            <th className="p-4 text-left">Project</th>
            <th className="p-4 text-left">Task</th>
            <th className="p-4 text-left">Hours</th>
            <th className="p-4 text-left">Status</th>
            <th className="p-4 text-left">Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="border-t">
              {admin && <td className="p-4">{item.employeeName}</td>}
              <td className="p-4">{item.date}</td>
              <td className="p-4">{item.project}</td>
              <td className="p-4">{item.task}</td>
              <td className="p-4">{item.hours}</td>
              <td className="p-4 capitalize">{item.status}</td>
              <td className="p-4">
                {admin ? (
                  <div className="flex gap-2">
                    <button className="bg-green-600 text-white px-3 py-2 rounded-lg">
                      Approve
                    </button>
                    <button className="bg-red-600 text-white px-3 py-2 rounded-lg">
                      Reject
                    </button>
                  </div>
                ) : (
                  <button className="bg-red-600 text-white px-3 py-2 rounded-lg">
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}

          {data.length === 0 && (
            <tr>
              <td
                colSpan={admin ? 7 : 6}
                className="p-6 text-center text-gray-500"
              >
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}