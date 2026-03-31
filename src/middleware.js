import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/monthly-timesheets/:path*",
    "/api/holidays/:path*",
    "/api/employees/:path*",
  ],
};