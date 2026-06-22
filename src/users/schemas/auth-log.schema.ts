import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuthLogDocument = HydratedDocument<AuthLog>;

@Schema({ timestamps: true, collection: 'auth_logs' })
export class AuthLog {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  action: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ default: true })
  success: boolean;
}

export const AuthLogSchema = SchemaFactory.createForClass(AuthLog);
