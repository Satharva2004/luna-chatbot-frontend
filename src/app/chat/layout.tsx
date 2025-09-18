    import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ProtectedRoute from '@/components/auth/protected-route';
import { Navbar } from '@/components/ui/navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Chat | Eduvance AI',
  description: 'Chat with Eduvance AI',
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
