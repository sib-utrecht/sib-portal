import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";

export function AccountMenu() {
  const { logout, userEmail } = useAuth();
  const initial = userEmail?.trim().charAt(0).toUpperCase() || "U";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="rounded-full outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-[#21526f]/30"
          aria-label="Open account menu"
        >
          <Avatar className="size-9 ring-2 ring-[#21526f]/20 transition-colors hover:ring-[#21526f]/40">
            <AvatarFallback className="bg-[#eaf3f7] font-semibold text-[#21526f]">
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 overflow-hidden rounded-xl border border-[#21526f]/10 bg-white p-1.5 text-gray-900 shadow-xl shadow-[#21526f]/10"
        >
          <DropdownMenu.Label className="px-2.5 py-2">
            <span className="block text-xs font-medium text-gray-500">Logged in as</span>
            <span className="mt-0.5 block max-w-64 truncate text-sm font-semibold text-[#21526f]">
              {userEmail ?? "User"}
            </span>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-[#21526f]/10" />
          <DropdownMenu.Item
            onSelect={logout}
            className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors focus:bg-[#eaf3f7] focus:text-[#21526f]"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
