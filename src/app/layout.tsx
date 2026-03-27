import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthWrapper } from '@/components/layout/AuthWrapper'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { PrivacyProvider } from '@/contexts/PrivacyContext'

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
  themeColor: '#D44A1A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className="theme-dark font-dm-sans">
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
        {/* DM Sans jako primární font — ostatní se lazy-injectují přes ThemeProvider */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400;1,9..40,500&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider />
        {/* Mobile: centrovaný shell. PC (lg+): full-width sidebar layout */}
        <div className="min-h-screen flex justify-center" style={{ background: 'var(--bg)' }}>
          <div
            className="relative w-full max-w-[390px] lg:max-w-none min-h-screen flex flex-col lg:flex-row shadow-2xl lg:shadow-none"
            style={{ background: 'var(--bg)' }}
          >
            <PrivacyProvider>
              <AuthWrapper>
                {children}
              </AuthWrapper>
            </PrivacyProvider>
          </div>
        </div>
      </body>
    </html>
  )
}
