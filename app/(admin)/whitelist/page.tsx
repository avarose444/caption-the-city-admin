import CrudPage from "@/components/CrudPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return <CrudPage tableKey="whitelist_email_addresses" />;
}
