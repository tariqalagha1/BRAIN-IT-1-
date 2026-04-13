import "./globals.css";

export const metadata = {
  title: "ClinicalMind",
  description: "Clinical operations dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
