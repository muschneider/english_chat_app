import { requireApprovedUser } from "@/lib/auth/session";
import { ChatApp } from "@/components/ChatApp";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const user = await requireApprovedUser();
  return (
    <ChatApp
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        theme: user.theme,
        englishLevel: user.englishLevel,
        nativeLanguage: user.nativeLanguage,
      }}
    />
  );
}
