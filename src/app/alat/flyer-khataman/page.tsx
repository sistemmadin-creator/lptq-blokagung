import React from "react";
import type { Metadata } from "next";
import { FlyerKhatamanModule } from "@/components/flyer/FlyerKhatamanModule";

export const metadata: Metadata = {
  title: "Flyer Khataman | LPTQ Pondok Pesantren Darussalam Blokagung",
  description:
    "Pembuat flyer apresiasi khataman Al-Qur'an 30 juz (bil hifdzi) santri secara otomatis.",
};

export default function FlyerKhatamanPage() {
  return <FlyerKhatamanModule />;
}
