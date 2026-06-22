import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ModulePermission, UserRole } from '../../common/enums/modules.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.REPRESENTANTE_COMERCIAL })
  role: UserRole;

  @Prop({ type: Array, default: [] })
  permissions: ModulePermission[];

  @Prop({ default: true })
  active: boolean;

  @Prop()
  representativeId?: string;

  @Prop()
  avatar?: string;

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
