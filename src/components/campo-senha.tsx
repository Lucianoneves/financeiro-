"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

export function CampoSenha() {
  const id = useId();
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id}>Senha</label>
      <div className="relative">
        <input
          id={id}
          name="senha"
          type={visivel ? "text" : "password"}
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-zinc-300 bg-transparent py-2 pl-3 pr-10 dark:border-zinc-700"
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {visivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}
