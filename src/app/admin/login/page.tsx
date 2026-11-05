import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata = { title: "შესვლა" };

export default function LoginPage() {
  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <Image src="/images/shavdia-logo.jpg" alt="SHAVDIA" width={1280} height={102} sizes="330px" loading="eager" />
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
