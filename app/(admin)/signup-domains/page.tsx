import CrudPage from "@/components/CrudPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return <CrudPage tableKey="allowed_signup_domains" />;
}
