// seed-firebase.js
// Popula as coleções cs_prompts, cs_pilares, cs_membros, cs_analistas e cs_coordenadores
// no Firestore a partir dos dados exportados do Supabase.
//
// USO:
//   FIREBASE_PROJECT_ID=xxx FIREBASE_CLIENT_EMAIL=xxx FIREBASE_PRIVATE_KEY="xxx" node seed-firebase.js
//
// Ou crie um arquivo .env.local e use: node --env-file=.env.local seed-firebase.js

import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(readFileSync('./serviceAccount.json', 'utf8'));

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// ─── PROMPTS ────────────────────────────────────────────────────────────────
const prompts = [
  {
    chave: 'instrucao_avaliacao',
    titulo: 'Instrução de ancoragem e rigor na avaliação',
    ativo: true,
    conteudo: `REGRAS OBRIGATÓRIAS PARA AVALIAÇÃO:
1. Para cada pilar, identifique um trecho específico da transcrição que justifica a nota antes de atribuí-la.
2. A nota deve refletir a média da reunião. Se o CS errou algo crítico mesmo uma vez, isso deve reduzir a nota.
3.  A nota 5 é reservada para quem não tem pontos de melhoria. Nota 4 indica boa performance com ao menos uma oportunidade de melhoria clara. Nota 3 é adequado, com duas ou mais lacunas visíveis, 2 abaixo do esperado, com lacunas em pontos críticos e nota 1 não atendeu aos requisitos fundamentais.
5. Não infira comportamentos que não aparecem explicitamente na transcrição.`,
  },
  {
    chave: 'instrucao_contexto_cs',
    titulo: 'Contexto geral do papel do CS Nibo',
    ativo: true,
    conteudo: `O CS avaliado é um Analista de Customer Success da Nibo, empresa de software contábil B2B.
Ele conduz reuniões de onboarding e implementação com contadores e escritórios de contabilidade.
O objetivo de cada reunião é garantir que o cliente ative e use os módulos do Nibo corretamente dentro de um prazo de 60 dias, em até 3 reuniões.
Avalie sempre considerando esse contexto: o cliente é contador, o produto é complexo, e o CS precisa ser ao mesmo tempo técnico, consultivo e didático.`,
  },
  {
    chave: 'instrucao_media_final',
    titulo: 'Regra de cálculo da média final',
    ativo: true,
    conteudo: `A media_final deve ser a média aritmética simples de todas as notas válidas (excluindo -1).
Arredonde para uma casa decimal. Não inclua pilares sem evidência (-1) no cálculo.`,
  },
  {
    chave: 'instrucao_avaliacao_justa',
    titulo: 'Regras de avaliação justa — o que NÃO penalizar',
    ativo: true,
    conteudo: `NUNCA atribua nota baixa por eventos fora do controle do CS:

❌ NÃO penalize por problemas de produto ou bugs do Nibo
   → Ex: emissor de NFS-e com erro, limitação de funcionalidade, lentidão do sistema

❌ NÃO penalize por desalinhamento de vendas
   → Ex: cliente com expectativa errada criada antes do onboarding pelo time comercial

❌ NÃO penalize por encaminhar ao suporte ou especialista
   → Acionar suporte é conduta CORRETA. Demonstra autoridade e cuidado com o cliente.

❌ NÃO penalize por demora ou falha do suporte
   → O CS não controla o tempo de resposta do time de suporte

❌ NÃO penalize por regras de negócio da Nibo que o cliente não gostou
   → Ex: cobrança por consulta de CND, prazo de verificação de pagamento a partir do dia 10
   → Se o CS explicou corretamente a regra, a nota deve ser boa

❌ NÃO penalize por cliente resistente, difícil ou insatisfeito por motivos externos
   → O CS não controla o perfil ou humor do cliente

❌ NÃO penalize por não saber algo na hora se buscou a resposta correta
   → Comprometer-se a verificar e retornar é conduta honesta e positiva

✅ AVALIE APENAS a conduta, postura, conhecimento e comunicação DO CS`,
  },
  {
    chave: 'instrucao_escala_notas',
    titulo: 'Escala de notas 1-5 com critérios claros',
    ativo: true,
    conteudo: `ESCALA DE NOTAS (1 a 5):
5 — Muito bom: Eventuais oportunidades de melhoria são de refinamento, não lacunas reais.
4 — Bom: Ao menos uma oportunidade de melhoria clara e aplicável.
3 — Regular:  Duas ou mais lacunas visíveis que impactam o resultado.
2 — Ruim: Lacunas significativas em pontos críticos do critério.
1 — Crítico: Não atendeu ao critério. Ausência ou execução incorreta dos requisitos fundamentais.
-1 — Sem evidência: o pilar simplesmente não apareceu na conversa

NÃO force nota baixa quando o pilar não foi exercido — use -1.`,
  },
  {
    chave: 'instrucao_pontos_atencao',
    titulo: 'Regra para geração de pontos de atenção',
    ativo: true,
    conteudo: `Os pontos_atencao devem listar APENAS comportamentos e condutas do CS que podem ser melhorados.

NÃO inclua como ponto de atenção:
❌ Problemas técnicos ou bugs do produto Nibo
❌ Falhas ou demora do suporte
❌ Regras de negócio da Nibo que o cliente não gostou
❌ Expectativas erradas criadas por vendas
❌ Comportamento ou resistência do cliente
❌ Situações fora do controle do CS
❌ O CS ter acionado o suporte (isso é positivo)

✅ Inclua apenas: oportunidades reais de melhoria na conduta, comunicação, postura, conhecimento ou processo do próprio CS.`,
  },
  {
    chave: 'instrucao_justificativas',
    titulo: 'Regra para justificativas de notas nos pilares',
    ativo: true,
    conteudo: `Ao justificar as notas de cada pilar:
- Se a nota foi boa (4-5): destaque o que o CS fez bem de concreto com base na transcrição
- Se a nota foi média (3): aponte o que o CS poderia ter feito diferente na CONDUTA
- NÃO justifique nota baixa por problemas de produto, suporte, regras da Nibo ou comportamento do cliente
- NÃO sugira como melhoria algo que estava fora do controle do CS
- Encaminhar ao suporte é positivo — nunca mencione isso como ponto de melhoria`,
  },
];

// ─── PILARES ────────────────────────────────────────────────────────────────
const pilares = [
  { key:'consultividade',   label:'Consultividade',       ativo:true, ordem:1,  peso:1, critico:false,
    descricao:'Age como parceira estratégica, sugere a melhor forma de implementar gradualmente, explica o valor de negócio por trás das funcionalidades.',
    rubrica:{'1':'Não faz perguntas; apenas executa tarefas técnicas sem entender o contexto do cliente.','2':'Faz poucas perguntas, foca em executar o roteiro sem adaptar ao negócio do cliente.','3':'Demonstra alguma preocupação com o contexto, mas não conecta as funcionalidades ao valor de negócio.','4':'Entende o contexto e sugere boas práticas, mas ainda falta proatividade em propor melhorias estratégicas.','5':'Age consistentemente como parceira estratégica, conecta cada funcionalidade ao valor real para o negócio do cliente.'} },
  { key:'escuta_ativa',     label:'Escuta Ativa',          ativo:true, ordem:2,  peso:1, critico:false,
    descricao:'Ouve atentamente o contexto de cada cliente e adapta a conversa e as soluções conforme as necessidades identificadas.',
    rubrica:{'1':'Não demonstra atenção ao que o cliente fala; segue o roteiro independente do contexto.','2':'Ouve, mas raramente usa o que escutou para adaptar a conversa.','3':'Presta atenção e adapta alguns pontos, mas ainda segue o roteiro de forma rígida.','4':'Adapta a conversa com base no que ouviu, mas pode deixar passar informações importantes.','5':'Ouve atentamente, usa o contexto do cliente para personalizar toda a condução da reunião.'} },
  { key:'jornada_cliente',  label:'Jornada do Cliente',    ativo:true, ordem:3,  peso:1, critico:false,
    descricao:'Estabelece com clareza a jornada de implementação, define próximos passos, deveres de casa e gerencia as expectativas do cliente.',
    rubrica:{'1':'Não explica a jornada nem define próximos passos ao final da reunião.','2':'Menciona a jornada superficialmente, mas sem clareza sobre prazos ou responsabilidades.','3':'Explica a jornada e define próximos passos, mas falta precisão ou alinhamento com o cliente.','4':'Conduz bem a jornada e define próximos passos, mas pode melhorar no gerenciamento de expectativas.','5':'Estabelece com clareza a jornada completa (prazo, etapas, reuniões) e alinha deveres de casa com o cliente.'} },
  { key:'encantamento',     label:'Encantamento',          ativo:true, ordem:4,  peso:1, critico:false,
    descricao:'Cria momentos de encantamento e entrega valor além do esperado, com gestos proativos e materiais de apoio.',
    rubrica:{'1':'Não demonstra entusiasmo; entrega o mínimo esperado sem nenhum gesto adicional.','2':'É cordial, mas não cria nenhum momento de encantamento ou surpresa positiva.','3':'Entrega o conteúdo com competência, mas sem gestos proativos ou diferenciados.','4':'Disponibiliza materiais de apoio ou faz algum gesto proativo, mas poderia ir além.','5':'Cria momentos uau, antecipa necessidades do cliente e entrega valor além do que foi pedido.'} },
  { key:'objecoes',         label:'Objeções/Bugs',         ativo:true, ordem:5,  peso:1, critico:false,
    descricao:'Lida com objeções, bugs, problemas técnicos e imprevistos com calma e apresentando soluções.',
    rubrica:{'1':'Trava ou demonstra insegurança diante de objeções ou problemas; não apresenta solução.','2':'Tenta contornar objeções, mas de forma pouco convincente ou sem solução clara.','3':'Lida com objeções razoavelmente, mas sem total confiança ou sem solução definitiva.','4':'Contorna bem a maioria das objeções com calma e apresenta soluções adequadas.','5':'Lida com maestria com qualquer objeção ou imprevisto, sempre com calma e solução prática.'} },
  { key:'rapport',          label:'Rapport',               ativo:true, ordem:6,  peso:1, critico:false,
    descricao:'Constrói conexão genuína com o cliente, demonstrando empatia, paciência e interesse pelo negócio dele.',
    rubrica:{'1':'Tom frio e impessoal; não demonstra interesse pelo cliente como pessoa ou negócio.','2':'É educado, mas a relação é puramente transacional, sem conexão real.','3':'Demonstra simpatia, mas não aprofunda a relação nem mostra interesse genuíno.','4':'Boa conexão com o cliente, chama pelo nome e demonstra empatia, mas poderia aprofundar.','5':'Constrói excelente rapport, chama pelo nome, entende o negócio e demonstra empatia genuína.'} },
  { key:'autoridade',       label:'Autoridade',            ativo:true, ordem:7,  peso:1, critico:false,
    descricao:'Conduz a reunião com confiança, ritmo adequado e diretividade, passando segurança ao cliente.',
    rubrica:{'1':'Inseguro, hesita muito, perde o fio da meada; o cliente percebe falta de confiança.','2':'Demonstra alguma insegurança em momentos críticos; ritmo irregular.','3':'Conduz com razoável segurança, mas falta diretividade em alguns momentos.','4':'Conduz bem a reunião com confiança e ritmo, mas pode melhorar a diretividade.','5':'Conduz com total confiança e autoridade, guia o cliente com clareza e ritmo adequado.'} },
  { key:'postura',          label:'Postura',               ativo:true, ordem:8,  peso:1, critico:false,
    descricao:'Mantém postura profissional e resiliente mesmo diante de problemas técnicos ou situações adversas.',
    rubrica:{'1':'Demonstra frustração ou despreparo diante de problemas; postura inadequada.','2':'Tenta manter a compostura, mas deixa transparecer desconforto diante de adversidades.','3':'Mantém postura profissional na maioria do tempo, mas oscila em momentos de pressão.','4':'Postura profissional consistente; lida bem com adversidades com pequenas oscilações.','5':'Postura exemplar mesmo diante de bugs, falhas ou clientes difíceis; foco total na solução.'} },
  { key:'gestao_tempo',     label:'Gestão de Tempo',       ativo:true, ordem:9,  peso:1, critico:false,
    descricao:'Gerencia bem o tempo da reunião, cobrindo a pauta sem atrasar e mantendo o ritmo adequado.',
    rubrica:{'1':'Não gerencia o tempo; a reunião fica incompleta ou muito além do previsto sem necessidade.','2':'Tem dificuldade com o tempo; perde em detalhes desnecessários ou deixa itens importantes de fora.','3':'Cobre a pauta, mas o tempo não é otimizado; há momentos de dispersão.','4':'Gerencia bem o tempo na maioria das reuniões, com pequenos estouros justificáveis.','5':'Cobre toda a pauta no tempo previsto, com ritmo fluido e sem deixar o cliente sobrecarregado.'} },
  { key:'contextualizacao', label:'Contextualização',      ativo:true, ordem:10, peso:1, critico:false,
    descricao:'Explica o porquê de cada funcionalidade, conectando ao dia a dia do contador com exemplos práticos.',
    rubrica:{'1':'Mostra o que fazer sem explicar por quê; o cliente não entende o valor por trás da função.','2':'Dá algum contexto, mas de forma superficial e sem conexão com a realidade do cliente.','3':'Contextualiza razoavelmente, mas os exemplos são genéricos ou desconectados do negócio.','4':'Boa contextualização com exemplos práticos, mas pode ser mais específico para o perfil do cliente.','5':'Explica o porquê de tudo com exemplos do dia a dia do contador, gerando entendimento profundo.'} },
  { key:'clareza',          label:'Clareza',               ativo:true, ordem:11, peso:1, critico:false,
    descricao:'Comunicação clara e didática, quebrando processos complexos em etapas simples para qualquer perfil de cliente.',
    rubrica:{'1':'Linguagem confusa, usa termos técnicos sem explicar; o cliente claramente não entende.','2':'Razoavelmente claro, mas deixa o cliente com dúvidas recorrentes sobre o mesmo tema.','3':'Explica de forma clara, mas às vezes perde a didática em processos mais complexos.','4':'Comunicação clara e didática na maioria do tempo; pequenas falhas em explicações mais densas.','5':'Comunicação exemplar; qualquer cliente, independente do nível técnico, entende com facilidade.'} },
  { key:'objetividade',     label:'Objetividade',          ativo:true, ordem:12, peso:1, critico:false,
    descricao:'Responde perguntas de forma assertiva e direta, sem rodeios desnecessários.',
    rubrica:{'1':'Respostas longas, vagas ou evasivas; o cliente precisa perguntar várias vezes.','2':'Tende a dar muita informação extra; às vezes não responde diretamente ao que foi perguntado.','3':'Razoavelmente objetivo, mas ainda inclui informações desnecessárias em algumas respostas.','4':'Respostas diretas e assertivas na maioria das vezes, com pequenas divagações ocasionais.','5':'Sempre responde de forma direta e assertiva, sem rodeios; o cliente obtém o que precisa rapidamente.'} },
  { key:'flexibilidade',    label:'Flexibilidade',         ativo:true, ordem:13, peso:1, critico:false,
    descricao:'Adapta o roteiro e as soluções conforme as prioridades e dificuldades do cliente em tempo real.',
    rubrica:{'1':'Segue o roteiro de forma rígida independente do que acontece; não adapta nada.','2':'Faz pequenas adaptações, mas resiste a mudar o plano original.','3':'Adapta o roteiro quando necessário, mas com alguma hesitação.','4':'Flexível e adaptável na maioria das situações; pequenas dificuldades em improvisos complexos.','5':'Adapta o roteiro com maestria em tempo real, encontrando soluções alternativas sempre que necessário.'} },
  { key:'dominio_produto',  label:'Domínio de Produto',    ativo:true, ordem:14, peso:1, critico:false,
    descricao:'Demonstra conhecimento profundo do Nibo, navegando com fluidez entre módulos, perfis e funcionalidades avançadas.',
    rubrica:{'1':'Erros básicos sobre o produto; não sabe responder dúvidas simples do cliente.','2':'Conhece o básico, mas trava em funcionalidades intermediárias ou avançadas.','3':'Conhecimento adequado para a maioria das situações; dificuldades pontuais em funcionalidades avançadas.','4':'Bom domínio do produto; navega com fluidez e raramente tem dificuldade.','5':'Domínio completo; explica funcionalidades avançadas, perfis de acesso e configurações com segurança total.'} },
  { key:'dominio_negocio',  label:'Domínio de Negócio',    ativo:true, ordem:15, peso:1, critico:false,
    descricao:'Entende diferentes modelos de negócio contábil e conecta a proposta de valor do Nibo a cada realidade.',
    rubrica:{'1':'Não demonstra conhecimento sobre o negócio do cliente ou sobre o mercado contábil.','2':'Entendimento superficial do negócio; não consegue conectar o produto à realidade do cliente.','3':'Entende o básico do negócio contábil, mas a conexão com o produto ainda é genérica.','4':'Boa compreensão do negócio e conecta bem o produto, com pequenas lacunas em perfis específicos.','5':'Entende profundamente diferentes modelos contábeis e conecta o Nibo à realidade específica de cada cliente.'} },
  { key:'ecossistema_nibo', label:'Ecossistema Nibo',      ativo:true, ordem:16, peso:1, critico:false,
    descricao:'Articula com clareza a integração e diferenças entre os produtos Nibo, explicando o que está no pacote do cliente.',
    rubrica:{'1':'Confunde os produtos Nibo ou não sabe explicar o que está no pacote do cliente.','2':'Conhece os produtos superficialmente; dificuldade em explicar diferenças e integrações.','3':'Explica o ecossistema razoavelmente, mas com imprecisões ou falta de clareza em alguns produtos.','4':'Boa articulação do ecossistema; explica bem o pacote do cliente com pequenas lacunas.','5':'Articula com total clareza todos os produtos, suas diferenças, integrações e o que faz parte do pacote.'} },
  { key:'universo_contabil',label:'Universo Contábil',     ativo:true, ordem:17, peso:1, critico:false,
    descricao:'Usa linguagem contábil com naturalidade, demonstrando conhecimento da rotina e dos desafios do contador.',
    rubrica:{'1':'Não usa linguagem contábil; parece não conhecer a rotina do contador.','2':'Usa alguns termos contábeis, mas de forma superficial ou imprecisa.','3':'Razoável familiaridade com a linguagem contábil; cobre o básico com segurança.','4':'Boa fluência na linguagem contábil; demonstra conhecimento da rotina do contador.','5':'Fala a língua do contador com naturalidade: DAS, DARF, eCAC, sistemas contábeis e rotina diária.'} },
];

// ─── MEMBROS (deduplicado — versão mais recente por nome) ───────────────────
const membros = [
  { nome_completo: 'Brayan Santos',        alias: ['brayan santos','brayan'],                              coordenador: 'Sayuri',  ativo: true },
  { nome_completo: 'Camille Vaz',          alias: ['camille vaz','camille'],                               coordenador: 'Sayuri',  ativo: true },
  { nome_completo: 'Carolina Miranda',     alias: ['carolina miranda','carolina'],                         coordenador: 'Sayuri',  ativo: true },
  { nome_completo: 'Isaque Silva',         alias: ['isaque silva','isaque'],                               coordenador: 'Sayuri',  ativo: true },
  { nome_completo: 'Larissa Mota',         alias: ['larissa mota'],                                        coordenador: 'Sayuri',  ativo: true },
  { nome_completo: 'Nataly Vieira',        alias: ['nataly vieira','nataly','nat vieira','nat'],            coordenador: 'Sayuri',  ativo: true },
  { nome_completo: 'Vinícius Oliveira',    alias: ['vinícius oliveira','vinicius oliveira','vinicius'],    coordenador: 'Sayuri',  ativo: true },
  { nome_completo: 'Ana de Battisti',      alias: ['ana de battisti','ana battisti','ana'],                coordenador: 'Taynara', ativo: true },
  { nome_completo: 'Denis Silva',          alias: ['denis silva','denis'],                                 coordenador: 'Taynara', ativo: true },
  { nome_completo: 'Larissa Teixeira',     alias: ['larissa teixeira'],                                    coordenador: 'Taynara', ativo: true },
  { nome_completo: 'Lorrayne Moreira',     alias: ['lorrayne moreira','lorrayne'],                         coordenador: 'Taynara', ativo: true },
  { nome_completo: 'Micaelle Martins',     alias: ['micaelle martins','micaelle'],                         coordenador: 'Taynara', ativo: true },
  { nome_completo: 'Sabrina Corrêa',       alias: ['sabrina corrêa','sabrina correa','sabrina','sabrina silva'], coordenador: 'Taynara', ativo: true },
  { nome_completo: 'Sthephany Talasca',    alias: ['sthephany talasca','sthephany','sthe'],                coordenador: 'Taynara', ativo: true },
  { nome_completo: 'Thais Silva',          alias: ['thais silva','thais'],                                 coordenador: 'Taynara', ativo: true },
  { nome_completo: 'Willian Martins',      alias: ['willian martins','willian'],                           coordenador: 'Taynara', ativo: true },
  { nome_completo: 'Yuri Santos',          alias: ['yuri santos','yuri'],                                  coordenador: 'Taynara', ativo: true },
  { nome_completo: 'Aline Almeida',        alias: ['aline almeida','aline'],                               coordenador: 'Michel',  ativo: true },
  { nome_completo: 'Bianca Kim',           alias: ['bianca kim','bianca'],                                 coordenador: 'Michel',  ativo: true },
  { nome_completo: 'Jéssica Barreiro',     alias: ['jéssica barreiro','jessica barreiro','jessica'],       coordenador: 'Michel',  ativo: true },
  { nome_completo: 'Julia Rodrigues',      alias: ['julia rodrigues','julia'],                             coordenador: 'Michel',  ativo: true },
  { nome_completo: 'Maria Fernanda Costa', alias: ['maria fernanda costa','mafê','mafe'],                  coordenador: 'Michel',  ativo: true },
  { nome_completo: 'Maryana Alves',        alias: ['maryana alves','maryana'],                             coordenador: 'Michel',  ativo: true },
  { nome_completo: 'Rafaele Oliveira',     alias: ['rafaele oliveira','rafaele'],                          coordenador: 'Michel',  ativo: true },
  { nome_completo: 'Túlio Morgado',        alias: ['túlio morgado','tulio morgado','túlio','tulio'],       coordenador: 'Michel',  ativo: true },
];

async function seed() {
  console.log('🔥 Iniciando seed do Firestore...\n');

  // ── cs_prompts ──────────────────────────────────────────────────────────
  console.log('📝 Inserindo cs_prompts...');
  for (const p of prompts) {
    await db.collection('cs_prompts').doc(p.chave).set(p);
    console.log(`   ✓ ${p.chave}`);
  }

  // ── cs_pilares ──────────────────────────────────────────────────────────
  console.log('\n📊 Inserindo cs_pilares...');
  for (const p of pilares) {
    await db.collection('cs_pilares').doc(p.key).set(p);
    console.log(`   ✓ ${p.key}`);
  }

  // ── cs_membros ──────────────────────────────────────────────────────────
  console.log('\n👥 Inserindo cs_membros...');
  for (const m of membros) {
    const docId = m.nome_completo.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    await db.collection('cs_membros').doc(docId).set(m);
    console.log(`   ✓ ${m.nome_completo} (${m.coordenador})`);
  }

  // ── cs_analistas ────────────────────────────────────────────────────────
  const analistas = [
    { nome:'Sabrina Silva',      coordenador:'Taynara', ativo:true },
    { nome:'Isaque Ramos',       coordenador:'Sayuri',  ativo:true },
    { nome:'Brayan Santos',      coordenador:'Sayuri',  ativo:true },
    { nome:'Nataly Vieira',      coordenador:'Sayuri',  ativo:true },
    { nome:'Debora Rezende',     coordenador:'Sayuri',  ativo:true },
    { nome:'Sthephany Talasca',  coordenador:'Taynara', ativo:true },
    { nome:'Rafaele Oliveira',   coordenador:'Michel',  ativo:true },
    { nome:'Julia Rodrigues',    coordenador:'Michel',  ativo:true },
    { nome:'Aline Almeida',      coordenador:'Michel',  ativo:true },
    { nome:'Maria Fernanda',     coordenador:'Michel',  ativo:true },
    { nome:'Denis Silva',        coordenador:'Taynara', ativo:true },
    { nome:'Lorrayne Moreira',   coordenador:'Taynara', ativo:true },
    { nome:'Thais Silva',        coordenador:'Taynara', ativo:true },
    { nome:'Larissa Teixeira',   coordenador:'Taynara', ativo:true },
  ];
  console.log('\n🧑‍💼 Inserindo cs_analistas...');
  for (const a of analistas) {
    const docId = a.nome.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    await db.collection('cs_analistas').doc(docId).set(a);
    console.log(`   ✓ ${a.nome} (${a.coordenador})`);
  }

  // ── cs_coordenadores ────────────────────────────────────────────────────
  const coordenadores = ['Taynara','Michel','Túlio','Jéssica','Sayuri'];
  console.log('\n👔 Inserindo cs_coordenadores...');
  for (const nome of coordenadores) {
    const docId = nome.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    await db.collection('cs_coordenadores').doc(docId).set({ nome, ativo: true });
    console.log(`   ✓ ${nome}`);
  }

  console.log('\n✅ Seed completo! Todas as coleções populadas.');
}

seed().catch(err => {
  console.error('❌ Erro no seed:', err.message);
  process.exit(1);
});
