import { describe, expect, it } from "vitest";
import { apontamentoSchema, campoDoErro, errosDoFormulario, montarApontamento } from "./producao";

// Formulário com a linha 0 vazia e a linha 2 preenchida (linha vazia não entra na lista).
const dados: Record<string, string> = {
  ordemId: "",
  maquinaId: "m1",
  operador: "",
  turno: "Manhã",
  inicio: "2026-11-05T08:00",
  fim: "2026-11-05T07:00",
  quantidadeBoa: "abc",
  parada: "",
  paradaMotivo2: "",
  paradaMinutos2: "",
  perdaMotivo2: "Refugo",
  perdaQuantidade2: "",
};

describe("campoDoErro", () => {
  it("devolve o nome do campo de nível superior", () => {
    expect(campoDoErro(["operador"], dados)).toBe("operador");
  });

  it("volta à linha original quando a linha de parada/perda vem depois de linhas vazias", () => {
    // Só a linha 2 entra na lista, então o índice 0 da lista é a linha 2 do formulário.
    expect(campoDoErro(["perdas", 0, "motivo"], dados)).toBe("perdaMotivo2");
    expect(campoDoErro(["perdas", 0, "quantidade"], dados)).toBe("perdaQuantidade2");
  });

  it("não inventa campo para caminho desconhecido", () => {
    expect(campoDoErro([], dados)).toBeUndefined();
  });
});

describe("errosDoFormulario", () => {
  it("lista todos os campos com erro, uma mensagem por campo", () => {
    const r = apontamentoSchema.safeParse(montarApontamento(dados));
    expect(r.success).toBe(false);
    if (r.success) return;
    const erros = errosDoFormulario(r.error.issues, dados);
    const campos = erros.map((e) => e.campo);
    expect(campos).toContain("ordemId");
    expect(campos).toContain("operador");
    expect(campos).toContain("quantidadeBoa");
    expect(campos).toContain("perdaQuantidade2");
    expect(new Set(campos).size).toBe(campos.length);
  });

  it("mensagem traz o nome do campo (ex.: operador)", () => {
    const erros = errosDoFormulario(
      [{ path: ["operador"], message: "Operador: informe o nome" }],
      dados,
    );
    expect(erros).toEqual([{ campo: "operador", mensagem: "Operador: informe o nome" }]);
  });

  it("mantém só a primeira mensagem de um mesmo campo", () => {
    const erros = errosDoFormulario(
      [
        { path: ["quantidadeBoa"], message: "Quantidade boa: use um número inteiro" },
        { path: ["quantidadeBoa"], message: "Quantidade boa: informe entre 0 e 10000000" },
      ],
      dados,
    );
    expect(erros).toHaveLength(1);
    expect(erros[0].mensagem).toBe("Quantidade boa: use um número inteiro");
  });
});
