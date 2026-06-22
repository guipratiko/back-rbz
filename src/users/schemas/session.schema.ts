import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

@Schema({ timestamps: true, collection: 'sessions' })
export class Session {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  refreshToken: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;

  @Prop({ default: true })
  active: boolean;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
