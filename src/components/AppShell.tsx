import React from "react";
import bgImage from "../assets/bg.jpg";
import { AppLogoWatermark } from "./AppLogo";

type Props = {
  children: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  return (
    <div className="glass-app min-h-screen text-slate-200 font-sans antialiased relative">
      <div className="app-bg-layer" style={{ backgroundImage: `url(${bgImage})` }} aria-hidden />
      <div className="app-bg-scrim" aria-hidden />
      <AppLogoWatermark />
      <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
    </div>
  );
}
