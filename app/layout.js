import './globals.css';

export const metadata = {
  title: 'Informes Google Ads · Aibe Technologies',
  description: 'Generador de informes mensuales de Google Ads para clientes de Aibe Technologies',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
