import { withAuth } from "next-auth/middleware";
import { isPastValidTo } from "@/lib/datePolicy";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ token, req }) {
      if (req.nextUrl.pathname === "/api/cron/monthly-timesheet-reminders") {
        const secret = process.env.CRON_SECRET;
        return Boolean(
          secret && req.headers.get("authorization") === `Bearer ${secret}`
        );
      }
      return Boolean(
        token &&
          token.lifecycleChecked &&
          !token.accessRevoked &&
          !isPastValidTo(token.leavingDate)
      );
    },
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/((?!auth/).*)",
  ],
};
