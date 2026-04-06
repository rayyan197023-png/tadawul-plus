export const metadata = {
  title: 'تداول+',
  description: 'تحليل الأسهم السعودية بالذكاء الاصطناعي',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}