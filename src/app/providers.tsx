import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ConfirmProvider } from "@/components/feedback/ConfirmProvider";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { createQueryClient } from "./queryClient";

const queryClient = createQueryClient();

export function AppProviders({ children, client = queryClient }: { children: ReactNode; client?: QueryClient }) {
  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>{children}</AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
