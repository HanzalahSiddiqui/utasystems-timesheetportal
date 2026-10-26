import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { isPastValidTo } from "@/lib/datePolicy";

export const authOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        await connectDB();

        const user = await User.findOne({
          email: credentials.email.toLowerCase(),
        }).select("+password");

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (user.status !== "active") {
          throw new Error("User is inactive");
        }

        const isMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isMatch) {
          throw new Error("Invalid email or password");
        }

        if (isPastValidTo(user.leavingDate)) {
          user.status = "inactive";
          user.revokedAt = new Date();
          user.revokedBy = null;
          user.revocationReason = "Access expired after valid-to date";
          await user.save();
          throw new Error("This account is no longer active");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          leavingDate: user.leavingDate ? new Date(user.leavingDate).toISOString().slice(0, 10) : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.employeeId = user.employeeId;
        token.leavingDate = user.leavingDate || null;
        token.lifecycleChecked = true;
        token.accessRevoked = false;
      } else if (token.id) {
        await connectDB();
        const currentUser = await User.findById(token.id).select("status leavingDate");
        if (!currentUser || currentUser.status !== "active" || isPastValidTo(currentUser.leavingDate)) {
          if (currentUser?.status === "active" && isPastValidTo(currentUser.leavingDate)) {
            currentUser.status = "inactive";
            currentUser.revokedAt = new Date();
            currentUser.revokedBy = null;
            currentUser.revocationReason = "Access expired after valid-to date";
            await currentUser.save();
          }
          token.accessRevoked = true;
        } else {
          token.leavingDate = currentUser.leavingDate
            ? new Date(currentUser.leavingDate).toISOString().slice(0, 10)
            : null;
          token.lifecycleChecked = true;
          token.accessRevoked = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.accessRevoked) return null;
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.employeeId = token.employeeId;
        session.user.leavingDate = token.leavingDate || null;
        session.user.accessRevoked = !!token.accessRevoked;
        session.user.lifecycleChecked = !!token.lifecycleChecked;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
