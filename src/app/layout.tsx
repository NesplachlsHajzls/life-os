import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthWrapper } from '@/components/layout/AuthWrapper'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

export const metadata: Metadata = {
  title: 'Life OS',
  description: 'Tvůj osobní operační systém',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Life OS',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1E4B8E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className="theme-ocean font-inter">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {})
            })
          }
        `}} />
        {/* Only Inter is preloaded — other fonts are injected lazily by ThemeProvider when selected */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider />
        {/* Mobile: centered phone shell. PC (lg+): full-width sidebar layout */}
        <div className="min-h-screen flex justify-center bg-gray-100 lg:bg-[#F4F6FA]">
          <div className="relative w-full max-w-[390px] lg:max-w-none min-h-screen bg-[#F4F6FA] flex flex-col lg:flex-row shadow-2xl lg:shadow-none">
            <AuthWrapper>
              {children}
            </AuthWrapper>
          </div>
        </div>
      </body>
    </html>
  )
}
