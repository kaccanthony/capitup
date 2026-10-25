import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="secondary" aria-label="Sign out">
        <LogOut aria-hidden="true" data-icon="inline-start" />
        Sign out
      </Button>
    </form>
  );
}
