export default function EmployeeTable({ data = [] }) {
  return (
    <div className="bg-white rounded-2xl shadow overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-4 text-left">Name</th>
            <th className="p-4 text-left">Email</th>
            <th className="p-4 text-left">Employee ID</th>
            <th className="p-4 text-left">Designation</th>
            <th className="p-4 text-left">Department</th>
            <th className="p-4 text-left">Role</th>
            <th className="p-4 text-left">Status</th>
          </tr>
        </thead>

        <tbody>
          {data.map((emp) => (
            <tr key={emp.id} className="border-t">
              <td className="p-4">{emp.name}</td>
              <td className="p-4">{emp.email}</td>
              <td className="p-4">{emp.employeeId}</td>
              <td className="p-4">{emp.designation}</td>
              <td className="p-4">{emp.department}</td>
              <td className="p-4 capitalize">{emp.role}</td>
              <td className="p-4 capitalize">{emp.status}</td>
            </tr>
          ))}

          {data.length === 0 && (
            <tr>
              <td colSpan="7" className="p-6 text-center text-gray-500">
                No employees found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}