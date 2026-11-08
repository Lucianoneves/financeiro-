"use client";

import { Button } from "@/components/ui/button";

// Abre a impressão do navegador (também serve para salvar em PDF).
export function BotaoImprimir() {
  return (
    <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
      Imprimir
    </Button>
  );
}
