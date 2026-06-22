import 'dotenv/config';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  buildDefaultPermissions,
  UserRole,
} from '../src/common/enums/modules.enum';

const ADMIN_EMAIL = 'admin@rbz.com.br';

async function seedMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rbz';
  await mongoose.connect(uri);

  const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    permissions: Array,
    active: { type: Boolean, default: true },
    representativeId: String,
  });

  const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (!existing) {
    const hashed = await bcrypt.hash('admin123', 12);
    await User.create({
      name: 'Administrador RBZ',
      email: ADMIN_EMAIL,
      password: hashed,
      role: UserRole.ADMINISTRADOR,
      permissions: buildDefaultPermissions(UserRole.ADMINISTRADOR),
      active: true,
    });
    console.log('Admin criado: admin@rbz.com.br / admin123');
  } else {
    console.log('Admin já existe:', ADMIN_EMAIL);
  }

  await mongoose.disconnect();
}

async function main() {
  console.log('Seed mínimo — apenas usuário admin (sem dados fictícios).');
  await seedMongo();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
