// scripts/add-melhoria.js
// Salva uma melhoria manual diretamente no Firestore
// Uso: node --env-file=.env.local scripts/add-melhoria.js

import { db } from '../lib/firebase.js';

const melhoria = {
    descricao:     'NIBO não envia e-mail automático de primeiro acesso para clientes cadastrados via importação por planilha',
    produto:       'Nibo',
    tipo:          'funcionalidade',
    contexto:      'Durante o cadastro de clientes via importação por planilha',
    frase_cliente: 'o que não ocorre na importação via planilha',
};

const doc = {
    analista_nome:  'Manual',
    coordenador:    null,
    nome_cliente:   null,
    data_reuniao:   null,
    origem:         'manual_melhoria',
    tem_melhorias:  true,
    analise_json: {
        origem:        'manual_melhoria',
        tem_melhorias: true,
        melhorias:     [melhoria],
    },
    created_at: new Date(),
};

const ref = await db.collection('cs_reunioes').add(doc);
console.log('Salvo com ID:', ref.id);
