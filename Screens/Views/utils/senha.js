// Regras de senha usadas no Cadastro e na tela Alterar Senha.
// Mantidas aqui para as duas telas exigirem exatamente a mesma coisa.
export const regrasSenha = (valor = "") => [
  { id: "tamanho", texto: "Pelo menos 8 caracteres", ok: valor.length >= 8 },
  { id: "maiuscula", texto: "Uma letra maiúscula", ok: /[A-Z]/.test(valor) },
  { id: "numero", texto: "Um número", ok: /[0-9]/.test(valor) },
];

export const senhaValida = (valor = "") => regrasSenha(valor).every((r) => r.ok);
