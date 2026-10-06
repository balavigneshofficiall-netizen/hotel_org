import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const cookieStore = await cookies();
  const savedToken = cookieStore.get("annapoorna_table_token")?.value;
  const tableToken = savedToken ? decodeURIComponent(savedToken) : "tbl_annapoorna_08";

  redirect(`/menu?hotel=hotel-annapoorna&table=${encodeURIComponent(tableToken)}`);
}
