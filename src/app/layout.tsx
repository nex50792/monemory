import GlobalMenu from '@/components/GlobalMenu'
import MobileMenuToggle from '@/components/MobileMenuToggle'
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Monemory',
  description: 'マネモリーで支出と思い出を管理（Money+Memory）',
}

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <ClerkProvider>
      <html lang="ja">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <header className="fixed top-0 left-0 w-full z-50 h-16 bg-neutral-100 flex items-center px-3">
            <div className="flex items-center md:hidden space-x-2">
              <SignedIn>
                <div className="h-fit w-fit">
                  <UserButton />
                </div>
              </SignedIn>
              <SignedOut>
                <div className="h-fit bg-blue-500 w-fit p-2 rounded-md text-white text-sm font-semibold">
                  <SignInButton />
                </div>
              </SignedOut>
              <div>
                <MobileMenuToggle />
              </div>
              <div className="ml-3 text-lg font-semibold">Monemory</div>
            </div>
            <div className="hidden md:flex md:items-center md:ml-4 md:gap-4">
              <SignedOut>
                <div className="h-fit bg-blue-500 w-fit p-2 rounded-md text-white text-sm font-semibold">
                  <SignInButton />
                </div>
              </SignedOut>
              <SignedIn>
                <div className="h-fit w-fit">
                  <UserButton />
                </div>
              </SignedIn>
            </div>
          </header>
          <div className="pt-16">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
              <div className="md:grid md:grid-cols-[14rem_1fr_20rem] md:gap-6">
                <div className="md:block">
                  <GlobalMenu />
                </div>
                <main className="min-h-[calc(100dvh-4rem)]">
                  <div className="mx-auto max-w-xl">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </div>
        </body>
      </html>
    </ClerkProvider>
  )
}

export default RootLayout
