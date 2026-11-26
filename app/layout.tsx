import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BloodRavens | Red Encriptada',
  description: 'Red privada y encriptada de la casa BloodRavens.',
  generator: 'v0.app',
  robots: { index: false, follow: false },
  icons: { icon: '/images/bloodravens-shield.png', apple: '/images/bloodravens-shield.png' },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#080809',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
