import type { Metadata } from "next";
import SupportForm from "@/components/SupportForm";

export const metadata: Metadata = { title: "BOOST Support | Ezzey" };

export default function Page() {
  return <SupportForm />;
}
