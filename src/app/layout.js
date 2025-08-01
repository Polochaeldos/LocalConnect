import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "ServiceHub - Local Services Aggregator",
  description: "Connect with trusted local service providers in your area. Find electricians, tutors, cleaners, and more.",
  keywords: "local services, service providers, electricians, tutors, cleaners, home services",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
