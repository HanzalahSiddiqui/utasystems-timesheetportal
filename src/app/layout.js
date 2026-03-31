import "./globals.css";
import SessionWrapper from "./session-wrapper";

export const metadata = {
  title: "UTA Timesheet Portal",
  description: "UTA Systems Timesheet Portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}