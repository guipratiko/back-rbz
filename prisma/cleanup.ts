import 'dotenv/config';
import * as mongoose from 'mongoose';
import { createPrismaClient } from '../src/prisma/prisma.factory';

const ADMIN_EMAIL = 'admin@rbz.com.br';
const prisma = createPrismaClient();

async function cleanupPostgres() {
  const count = await prisma.client.count();
  if (count === 0) {
    console.log('PostgreSQL já estava limpo.');
    return;
  }

  console.log('Limpando dados do PostgreSQL...');

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      client_observations,
      appointments,
      orders,
      opportunities,
      client_brands,
      representative_brands,
      collection_brands,
      goals,
      marketing_leads,
      marketing_campaigns,
      clients,
      representatives,
      brands,
      collections
    RESTART IDENTITY CASCADE;
  `);

  console.log('PostgreSQL limpo.');
}

async function cleanupMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rbz';
  await mongoose.connect(uri);

  const userSchema = new mongoose.Schema({}, { strict: false });
  const User = mongoose.models.CleanupUser || mongoose.model('CleanupUser', userSchema, 'users');
  const Session = mongoose.models.CleanupSession || mongoose.model('CleanupSession', userSchema, 'sessions');
  const AuthLog = mongoose.models.CleanupAuthLog || mongoose.model('CleanupAuthLog', userSchema, 'auth_logs');

  const deletedUsers = await User.deleteMany({ email: { $ne: ADMIN_EMAIL } });
  await User.updateOne({ email: ADMIN_EMAIL }, { $unset: { representativeId: '' } });
  const deletedSessions = await Session.deleteMany({});
  const deletedLogs = await AuthLog.deleteMany({});

  console.log(`MongoDB: ${deletedUsers.deletedCount} usuário(s) removido(s)`);
  console.log(`MongoDB: ${deletedSessions.deletedCount} sessão(ões) removida(s)`);
  console.log(`MongoDB: ${deletedLogs.deletedCount} log(s) removido(s)`);
  console.log(`Admin preservado: ${ADMIN_EMAIL}`);

  await mongoose.disconnect();
}

async function main() {
  await cleanupPostgres();
  await cleanupMongo();
  console.log('Limpeza concluída. Banco pronto para uso real.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
