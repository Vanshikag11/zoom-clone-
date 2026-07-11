import "./globals.css";

export const metadata = {
  title: "ZoomClone",
  description: "A video conferencing platform clone",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
