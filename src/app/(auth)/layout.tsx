import { FC, ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout: FC<AuthLayoutProps> = ({ children }) => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-primary-bg px-4">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
};

export default AuthLayout;
