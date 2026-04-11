"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("正しいメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      setIsLoading(false);
      return;
    }

    // ロールに応じてリダイレクト
    const res = await fetch("/api/me");
    const user = await res.json();

    if (user.role === "guardian") router.push("/guardian");
    else if (user.role === "admin") router.push("/admin");
    else if (user.role === "driver") router.push("/driver");
    else router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100 px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">小平町スクールバス</h1>
          <p className="text-sm text-gray-500 mt-1">乗車連絡システム</p>
        </div>

        {/* ログインフォーム */}
        <div className="card">
          <div className="card-body space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="email" className="form-label">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="form-input"
                  placeholder="example@kodaira.lg.jp"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="form-error">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="form-input"
                  placeholder="パスワードを入力"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>

              {error && <div className="alert-error">{error}</div>}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    ログイン中...
                  </span>
                ) : (
                  "ログイン"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 電話連絡案内 */}
        <div className="mt-4 alert-info text-center">
          <p className="text-xs">
            ご不明な点は学校へ電話でご連絡ください<br />
            <strong>小平町立小平中学校: 0164-56-XXXX</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
