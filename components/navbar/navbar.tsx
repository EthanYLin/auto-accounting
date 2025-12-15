import { getUser } from "@/app/actions/auth";
import { NavbarClient } from "@/components/navbar/navbar-client";

export const Navbar = async () => {
  const user = await getUser();

  return <NavbarClient user={user} />;
};
