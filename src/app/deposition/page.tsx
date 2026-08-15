import type { Metadata } from "next";
import { DepositionWorkspace } from "@/components/deposition/deposition-workspace";

export const metadata: Metadata = {
  title: "Deposition analyser · Singapore Law Atlas",
  description:
    "Parse a deposition in the browser, surface the liability issues it raises, and link each one to the governing Singapore authorities.",
};

export default function DepositionPage() {
  return <DepositionWorkspace />;
}
