import { coreSchema, ref, integer, nullableDate, nullableString, choice, singleLine, nested } from './shared.js';

const eventTypes = ['assignment', 'comment', 'content', 'status'];
const events = () => ({
  type: [String], enum: eventTypes, default: () => [],
  validate: (values) => values.length <= 4 && new Set(values).size === values.length,
});
// Initial typed payload is deliberately small. Expand alongside each approved API/template.
const payload = nested({
  taskTitle: nullableString(300), workspaceName: nullableString(200), actorDisplayName: nullableString(100),
  previousStatus: { type: String, enum: ['todo', 'in_progress', 'done', null], default: null },
  status: { type: String, enum: ['todo', 'in_progress', 'done', null], default: null },
});
const cipher = nested({
  keyId: singleLine(100), nonce: singleLine(100), ciphertext: singleLine(16_384), tag: singleLine(100),
});
export const notificationSchema = coreSchema({
  recipientId: ref('User'), eventId: singleLine(100), category: choice(['work', 'invitation']),
  workspaceId: ref('Workspace'), taskId: ref('Task', true), invitationId: ref('WorkspaceInvitation', true), actorId: ref('User', true),
  changes: events(), payloadVersion: { ...integer(1, 1), enum: [1] },
  payload: { type: payload, default: () => ({}) }, readAt: nullableDate(),
}, { editable: false, updated: false, privateFields: ['payload'] });
notificationSchema.pre('validate', function() {
  if (this.category === 'work' && (!this.taskId || this.invitationId)) this.invalidate('category', 'Work notification requires Task only');
  if (this.category === 'invitation' && (!this.invitationId || this.taskId || this.changes.length)) this.invalidate('category', 'Invitation notification requires Invitation only');
});

export const outboxSchema = coreSchema({
  eventId: singleLine(100), recipientKey: singleLine(300), userId: ref('User', true),
  workspaceId: ref('Workspace', true), taskId: ref('Task', true), invitationId: ref('WorkspaceInvitation', true), authTokenId: ref('AuthToken', true),
  category: choice(['work', 'invitation', 'auth']), templateKey: singleLine(100),
  payloadVersion: { ...integer(1, 1), enum: [1] }, eventTypes: events(), payload: { type: payload, default: () => ({}) },
  encryptedDeliveryData: { type: cipher, default: null },
  state: choice(['pending', 'processing', 'sent', 'cancelled', 'failed'], 'pending'), attempts: integer(),
  nextAttemptAt: { type: Date, required: true }, leaseUntil: nullableDate(), leaseToken: nullableString(),
  providerMessageId: nullableString(), lastErrorCode: nullableString(100), sentAt: nullableDate(),
}, { editable: false, privateFields: ['recipientKey', 'payload', 'encryptedDeliveryData', 'leaseToken'] });
outboxSchema.pre('validate', function() {
  if (this.category === 'work' && (!this.userId || !this.workspaceId || !this.taskId || !this.eventTypes.length || this.invitationId || this.authTokenId)) this.invalidate('category', 'Invalid work email scope');
  if (this.category === 'invitation' && (!this.workspaceId || !this.invitationId || this.taskId || this.authTokenId || this.eventTypes.length)) this.invalidate('category', 'Invalid invitation email scope');
  if (this.category === 'auth' && (!this.userId || !this.authTokenId || this.workspaceId || this.taskId || this.invitationId || this.eventTypes.length)) this.invalidate('category', 'Invalid auth email scope');
  if (this.state === 'processing' && (!this.leaseUntil || !this.leaseToken)) this.invalidate('state', 'Processing requires a lease');
  if (this.state !== 'processing' && (this.leaseUntil !== null || this.leaseToken !== null)) this.invalidate('state', 'Nonprocessing state has no lease');
  if ((this.state === 'sent') !== Boolean(this.sentAt)) this.invalidate('sentAt', 'Sent state and sentAt must agree');
});
