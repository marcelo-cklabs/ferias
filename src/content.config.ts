import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const kv = z.object({ rotulo: z.string(), valor: z.string() }).strict();

const cartao = z.object({
  titulo: z.string().optional(),
  subtitulo: z.string().optional(),
  entradas: z.array(kv).default([]),
  total: z.string().optional(),
}).strict();

const secaoFicha = z.object({
  tipo: z.literal('ficha'),
  titulo: z.string(),
  icone: z.string().default('ℹ️'),
  cartoes: z.array(cartao).min(1),
  lembretes: z.array(z.string()).optional(),
  notas: z.array(z.string()).optional(),
}).strict();

const itemRoteiro = z.object({
  hora: z.string().optional(),
  titulo: z.string(),
  tag: z.string().optional(),
  status: z.string().optional(),
  endereco: z.string().optional(),
  enderecoUrl: z.string().url().optional(),
  meta: z.string().optional(),
}).strict();

const diaRoteiro = z.object({
  data: z.string(),
  diaSemana: z.string().optional(),
  local: z.string().optional(),
  texto: z.string().optional(),
  itens: z.array(itemRoteiro).optional(),
  tags: z.array(z.string()).optional(),
}).strict();

const secaoRoteiro = z.object({
  tipo: z.literal('roteiro'),
  titulo: z.string().default('Roteiro dia a dia'),
  icone: z.string().default('🗺️'),
  dias: z.array(diaRoteiro).min(1),
}).strict();

const perna = z.object({
  de: z.string(), deHora: z.string(), deNome: z.string(),
  para: z.string(), paraHora: z.string(), paraNome: z.string(),
  voo: z.string().optional(),
}).strict();

const trecho = z.object({
  titulo: z.string(),
  localizador: z.string().optional(),
  pernas: z.array(perna).min(1),
  conexao: z.string().optional(),
}).strict();

const secaoVoos = z.object({
  tipo: z.literal('voos'),
  titulo: z.string().default('Voos'),
  icone: z.string().default('✈️'),
  trechos: z.array(trecho).optional(),
  notas: z.array(z.string()).optional(),
}).strict();

const secaoHospedagem = z.object({
  tipo: z.literal('hospedagem'),
  titulo: z.string().default('Hospedagem'),
  icone: z.string().default('🏨'),
  cartoes: z.array(cartao).optional(),
  checklist: z.array(z.string()).optional(),
  destaque: z.string().optional(),
  notas: z.array(z.string()).optional(),
}).strict();

const linhaGasto = z.object({
  categoria: z.string(),
  descricao: z.string(),
  status: z.enum(['pago', 'recebido', 'pendente']).optional(),
  valor: z.number(),
}).strict();

const secaoGastos = z.object({
  tipo: z.literal('gastos'),
  titulo: z.string().default('Gastos'),
  icone: z.string().default('💰'),
  linhas: z.array(linhaGasto).default([]),
  totais: z.array(z.object({ rotulo: z.string(), valor: z.number() }).strict()).default([]),
  notas: z.array(z.string()).optional(),
}).strict();

const secaoChecklist = z.object({
  tipo: z.literal('checklist'),
  titulo: z.string(),
  icone: z.string().default('✅'),
  itens: z.array(z.object({ texto: z.string(), detalhe: z.string().optional() }).strict()).min(1),
}).strict();

const viagens = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/viagens' }),
  schema: z.object({
    titulo: z.string(),
    tituloCard: z.string(),
    emoji: z.string(),
    subtitulo: z.string(),
    rota: z.object({
      origem: z.string(), origemNome: z.string(),
      destino: z.string(), destinoNome: z.string(),
      retorno: z.string().optional(), retornoNome: z.string().optional(),
    }).strict()
      .refine((r) => !r.retorno || !!r.retornoNome, { message: 'retornoNome e obrigatorio quando ha retorno' }),
    dataInicio: z.coerce.date(),
    dataCard: z.string(),
    dataDisplay: z.string(),
    pax: z.string(),
    status: z.enum(['planejando', 'confirmada', 'realizada']),
    statusLabel: z.string(),
    cor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    resumoCard: z.string(),
    bilhete: z.number().int().positive(),
    heroMeta: z.array(kv).default([]),
    footer: z.string(),
    secoes: z.array(z.discriminatedUnion('tipo', [
      secaoFicha, secaoRoteiro, secaoVoos, secaoHospedagem, secaoGastos, secaoChecklist,
    ])),
  }).strict(),
});

export const collections = { viagens };
