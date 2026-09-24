// Schema da collection `consultoria`: documentos de referência externos
// (consultorias contratadas), transcritos para YAML. Separado de
// content.config.ts para manter aquele arquivo enxuto — ele só importa e
// registra. Texto livre aceita **negrito** e *itálico* via mdInline.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const item = z.object({ texto: z.string(), detalhe: z.string().optional() }).strict();

const blocoLista = z.object({
  tipo: z.literal('lista'),
  titulo: z.string(),
  icone: z.string().default('•'),
  intro: z.string().optional(),
  itens: z.array(item).min(1),
  nota: z.string().optional(),
}).strict();

const blocoTabela = z.object({
  tipo: z.literal('tabela'),
  titulo: z.string(),
  icone: z.string().default('•'),
  intro: z.string().optional(),
  colunas: z.array(z.string()).min(2),
  // Sem refine cruzando linhas x colunas: membro de discriminatedUnion tem de
  // ser ZodObject puro (refine devolve ZodEffects e o union nao aceita).
  // A conferencia de largura fica no Blocos.astro, que preenche o que faltar.
  linhas: z.array(z.array(z.string())).min(1),
  nota: z.string().optional(),
}).strict();

const trecho = z.object({
  rotulo: z.string(),
  data: z.string(),
  cia: z.string(),
  cabine: z.string(),
  de: z.string(), deHora: z.string(),
  para: z.string(), paraHora: z.string(),
  duracao: z.string().optional(),
  milhas: z.string(),
  total: z.string().optional(),
  marcadores: z.array(z.string()).default([]),
  veredito: z.string().optional(),
}).strict();

const blocoPassagem = z.object({
  tipo: z.literal('passagem'),
  titulo: z.string(),
  icone: z.string().default('✈️'),
  intro: z.string().optional(),
  trechos: z.array(trecho).min(1),
  nota: z.string().optional(),
}).strict();

export const consultoria = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/consultoria' }),
  schema: z.object({
    titulo: z.string(),
    subtitulo: z.string(),
    consultor: z.string(),
    data: z.string(),
    resumo: z.string(),
    secoes: z.array(z.discriminatedUnion('tipo', [blocoLista, blocoTabela, blocoPassagem])).min(1),
    conflitos: z.array(z.object({
      titulo: z.string(),
      consultoria: z.string(),
      painel: z.string(),
      status: z.string(),
    }).strict()).default([]),
  }).strict(),
});
