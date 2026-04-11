import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role;

  if (role === "guardian") {
    redirect("/guardian");
  } else if (role === "admin") {
    redirect("/admin");
  } else if (role === "driver") {
    redirect("/driver");
  }

  redirect("/login");
}
