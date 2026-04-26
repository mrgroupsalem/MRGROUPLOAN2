import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NotificationScheduler from '@/components/NotificationScheduler'

const inter= Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MR Groups - Loan Management System',
  description: 'Professional Loan Management Web App for MR Groups',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Background notification scheduler */}
        <NotificationScheduler />
        {children}
      </body>
    </html>
  )
}
