export const metadata = {
  title: "Neuropsicóloga – Bárbara de Freitas",
  description: "Administração de convites e coleta de respostas de questionários clínicos",
};
import "./globals.css";
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}
