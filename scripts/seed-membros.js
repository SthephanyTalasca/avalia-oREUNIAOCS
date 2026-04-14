// scripts/seed-membros.js
// Popula a coleção cs_membros no Firestore com todos os analistas.
//
// Como rodar:
//   1. Crie um arquivo .env.local na raiz com as vars do Firebase
//   2. node --env-file=.env.local scripts/seed-membros.js

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                 from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

const MEMBROS = [
  // ── Time Sayuri ─────────────────────────────────────────────────────────
  { nome_completo: 'Brayan Santos',        alias: ['brayan santos','brayan'],                            coordenador: 'Sayuri Hoshi',   ativo: true },
  { nome_completo: 'Camille Vaz',          alias: ['camille vaz','camille'],                             coordenador: 'Sayuri Hoshi',   ativo: true },
  { nome_completo: 'Carolina Miranda',     alias: ['carolina miranda','carolina'],                       coordenador: 'Sayuri Hoshi',   ativo: true },
  { nome_completo: 'Isaque Silva',         alias: ['isaque silva','isaque'],                             coordenador: 'Sayuri Hoshi',   ativo: true },
  { nome_completo: 'Larissa Mota',         alias: ['larissa mota'],                                      coordenador: 'Sayuri Hoshi',   ativo: true },
  { nome_completo: 'Nataly Vieira',        alias: ['nataly vieira','nataly','nat vieira','nat'],          coordenador: 'Sayuri Hoshi',   ativo: true },
  { nome_completo: 'Vinícius Oliveira',    alias: ['vinícius oliveira','vinicius oliveira','vinicius'],   coordenador: 'Sayuri Hoshi',   ativo: true },

  // ── Time Taynara ─────────────────────────────────────────────────────────
  { nome_completo: 'Ana de Battisti',      alias: ['ana de battisti','ana battisti','ana'],               coordenador: 'Taynara Barroso', ativo: true },
  { nome_completo: 'Denis Silva',          alias: ['denis silva','denis'],                               coordenador: 'Taynara Barroso', ativo: true },
  { nome_completo: 'Larissa Teixeira',     alias: ['larissa teixeira'],                                  coordenador: 'Taynara Barroso', ativo: true },
  { nome_completo: 'Lorrayne Moreira',     alias: ['lorrayne moreira','lorrayne'],                       coordenador: 'Taynara Barroso', ativo: true },
  { nome_completo: 'Micaelle Martins',     alias: ['micaelle martins','micaelle'],                       coordenador: 'Taynara Barroso', ativo: true },
  { nome_completo: 'Sabrina Corrêa',       alias: ['sabrina corrêa','sabrina correa','sabrina'],         coordenador: 'Taynara Barroso', ativo: true },
  { nome_completo: 'Sthephany Talasca',    alias: ['sthephany talasca','sthephany','sthe'],              coordenador: 'Taynara Barroso', ativo: true },
  { nome_completo: 'Thais Silva',          alias: ['thais silva','thais'],                               coordenador: 'Taynara Barroso', ativo: true },
  { nome_completo: 'Willian Martins',      alias: ['willian martins','willian'],                         coordenador: 'Taynara Barroso', ativo: true },
  { nome_completo: 'Yuri Santos',          alias: ['yuri santos','yuri'],                                coordenador: 'Taynara Barroso', ativo: true },

  // ── Time Michel ──────────────────────────────────────────────────────────
  { nome_completo: 'Aline Almeida',        alias: ['aline almeida','aline'],                             coordenador: 'Michel Antunes',  ativo: true },
  { nome_completo: 'Bianca Kim',           alias: ['bianca kim','bianca'],                               coordenador: 'Michel Antunes',  ativo: true },
  { nome_completo: 'Jéssica Barreiro',     alias: ['jéssica barreiro','jessica barreiro','jessica'],     coordenador: 'Michel Antunes',  ativo: true },
  { nome_completo: 'Julia Rodrigues',      alias: ['julia rodrigues','julia'],                           coordenador: 'Michel Antunes',  ativo: true },
  { nome_completo: 'Maria Fernanda Costa', alias: ['maria fernanda costa','mafê','mafe'],                coordenador: 'Michel Antunes',  ativo: true },
  { nome_completo: 'Maryana Alves',        alias: ['maryana alves','maryana'],                           coordenador: 'Michel Antunes',  ativo: true },
  { nome_completo: 'Rafaele Oliveira',     alias: ['rafaele oliveira','rafaele'],                        coordenador: 'Michel Antunes',  ativo: true },
  { nome_completo: 'Túlio Morgado',        alias: ['túlio morgado','tulio morgado','túlio','tulio'],      coordenador: 'Michel Antunes',  ativo: true },
];

async function seed() {
  console.log('🔍 Verificando coleção cs_membros existente...');
  const existing = await db.collection('cs_membros').get();

  if (!existing.empty) {
    console.log(`⚠️  Já existem ${existing.size} documentos em cs_membros.`);
    console.log('   Apagando todos antes de reinserir...');
    const batch = db.batch();
    existing.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log('   ✅ Coleção limpa.');
  }

  console.log(`\n📥 Inserindo ${MEMBROS.length} analistas...`);
  const batch = db.batch();
  for (const m of MEMBROS) {
    const ref = db.collection('cs_membros').doc();
    batch.set(ref, { ...m, created_at: new Date().toISOString() });
  }
  await batch.commit();

  console.log('\n✅ Seed concluído! Times:');
  const porTime = {};
  MEMBROS.forEach(m => {
    if (!porTime[m.coordenador]) porTime[m.coordenador] = [];
    porTime[m.coordenador].push(m.nome_completo);
  });
  Object.entries(porTime).forEach(([coord, nomes]) => {
    console.log(`\n  ${coord} (${nomes.length}):`);
    nomes.forEach(n => console.log(`    • ${n}`));
  });

  process.exit(0);
}

seed().catch(err => { console.error('❌ Erro:', err.message); process.exit(1); });
