// ============================================================
// STIGA FINANCE — BACKUP MANUAL DO FIRESTORE
// Salva todos os dados de todos os usuários em JSON local
// ============================================================
// Como usar:
//   1. Coloque este arquivo na pasta raiz do projeto
//   2. Certifique-se que firebase-key.json está na mesma pasta
//   3. Execute: node backup-firestore.js
// ============================================================

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

// ── Inicializar Firebase Admin ──────────────────────────────
// Procura o firebase-key.json na pasta api/ ou na raiz
const keyPaths = [
    path.join(__dirname, 'api', 'firebase-key.json'),
    path.join(__dirname, 'firebase-key.json')
];

let serviceAccount = null;
for (const keyPath of keyPaths) {
    if (fs.existsSync(keyPath)) {
        serviceAccount = require(keyPath);
        console.log(`✅ firebase-key.json encontrado em: ${keyPath}`);
        break;
    }
}

if (!serviceAccount) {
    console.error('❌ firebase-key.json não encontrado!');
    console.error('   Procurado em:');
    keyPaths.forEach(p => console.error('   -', p));
    process.exit(1);
}

try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('✅ Firebase conectado!');
} catch (e) {
    console.error('❌ Erro ao inicializar Firebase:', e.message);
    process.exit(1);
}

const db = admin.firestore();

// ── Coleções que serão salvas no backup ─────────────────────
const COLLECTIONS = ['userData', 'users', 'feedbacks', 'userReminders'];

// ── Função principal ─────────────────────────────────────────
async function runBackup() {
    console.log('\n🔄 Iniciando backup do Firestore...\n');

    const backup = {
        createdAt: new Date().toISOString(),
        project: 'stiga-finance-72dbf',
        collections: {}
    };

    let totalDocs = 0;

    for (const collectionName of COLLECTIONS) {
        try {
            console.log(`📂 Exportando coleção: ${collectionName}`);
            const snapshot = await db.collection(collectionName).get();

            backup.collections[collectionName] = {};

            snapshot.forEach(doc => {
                backup.collections[collectionName][doc.id] = doc.data();
                totalDocs++;
            });

            console.log(`   ✅ ${snapshot.size} documento(s) exportado(s)`);
        } catch (e) {
            console.error(`   ⚠️ Erro ao exportar ${collectionName}:`, e.message);
            backup.collections[collectionName] = { error: e.message };
        }
    }

    // ── Gerar nome do arquivo com data e hora ────────────────
    const now = new Date();
    const dateStr = now.toISOString()
        .replace('T', '_')
        .replace(/:/g, '-')
        .split('.')[0];
    const fileName = `backup-stiga-${dateStr}.json`;

    // ── Criar pasta backups se não existir ───────────────────
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
        console.log('\n📁 Pasta "backups" criada!');
    }

    // ── Salvar arquivo ───────────────────────────────────────
    const filePath = path.join(backupDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf8');

    console.log('\n✅ Backup concluído!');
    console.log(`📄 Arquivo: backups/${fileName}`);
    console.log(`📊 Total de documentos: ${totalDocs}`);
    console.log(`⏰ Data/hora: ${now.toLocaleString('pt-BR')}\n`);

    process.exit(0);
}

runBackup().catch(err => {
    console.error('❌ Erro fatal:', err.message);
    process.exit(1);
});
