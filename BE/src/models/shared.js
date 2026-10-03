import mongoose from 'mongoose';
import { normalizeRichText, emptyRichText, CONTENT_LIMITS } from '../content/rich-text.js';

export const { Schema } = mongoose;
export const ref = (model, optional = false) => ({
  type: Schema.Types.ObjectId, ref: model, required: !optional, ...(optional ? { default: null } : {}),
});
export const integer = (value = 0, minimum = 0) => ({
  type: Number, default: value, required: true, min: minimum, validate: Number.isSafeInteger,
});
export const nullableDate = () => ({ type: Date, default: null });
export const nullableString = (max = 256) => ({ type: String, default: null, maxlength: max });
export const digest = () => ({ type: String, required: true, select: false, match: /^[a-f0-9]{64}$/u });
export const choice = (values, value) => ({ type: String, required: true, enum: values, ...(value === undefined ? {} : { default: value }) });
export const singleLine = (max) => ({
  type: String, required: true, maxlength: max,
  validate: (value) => Boolean(value.trim()) && !/[\u0000-\u001f\u007f\u2028\u2029]/u.test(value),
});
export const nested = (fields) => new Schema(fields, { _id: false, strict: 'throw' });
export const emailPreferences = nested({
  assignment: { type: Boolean, default: true }, comment: { type: Boolean, default: false },
  content: { type: Boolean, default: false }, status: { type: Boolean, default: false },
});
export const emailOverrides = nested(Object.fromEntries(
  ['assignment', 'comment', 'content', 'status'].map((event) => [event, choice(['inherit', 'on', 'off'], 'inherit')]),
));
export const richTextSchema = nested({
  format: choice(['prosemirror-json'], 'prosemirror-json'),
  schemaVersion: { ...integer(1, 1), enum: [1] },
  document: { type: Schema.Types.Mixed, required: true },
  plainText: { type: String, default: '' },
});
export const richText = (required = false) => ({ type: richTextSchema, required: true, ...(required ? {} : { default: emptyRichText }) });

export function coreSchema(fields, { editable = true, updated = true, privateFields = [] } = {}) {
  const schema = new Schema({
    ...fields,
    ...(editable ? { version: integer() } : {}),
  }, {
    strict: 'throw', strictQuery: 'throw', bufferCommands: false,
    autoIndex: false, autoCreate: false,
    timestamps: { createdAt: true, updatedAt: updated ? 'updatedAt' : false },
    versionKey: editable ? 'version' : false,
    optimisticConcurrency: editable,
    toJSON: { transform: (_document, value) => {
      for (const field of privateFields) delete value[field];
      return value;
    } },
  });
  for (const field of privateFields) schema.path(field)?.select(false);
  // Until scoped repositories exist, prohibit query writes that bypass document hooks/CAS.
  for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete']) {
    schema.pre(operation, function() { throw new Error('DIRECT_QUERY_WRITE_DISABLED'); });
  }
  schema.pre('insertMany', function() { throw new Error('DIRECT_BULK_WRITE_DISABLED'); });
  schema.pre('bulkWrite', function() { throw new Error('DIRECT_BULK_WRITE_DISABLED'); });
  return schema;
}

export function contentHook(schema, field, scope, required = false) {
  schema.pre('validate', function() {
    try {
      const value = this.get(field);
      const normalized = normalizeRichText(value?.toObject() ?? value, { maxCharacters: CONTENT_LIMITS[scope], required });
      this.set(field, normalized);
      if (scope === 'task') this.searchText = `${this.title ?? ''}\n${normalized.plainText}`.normalize('NFC').toLocaleLowerCase('vi');
    } catch (error) { this.invalidate(field, error.message); }
  });
}

export function register(name, schema, collection, indexes) {
  for (const index of indexes) {
    schema.index(index.keys, {
      name: index.name,
      ...(index.unique ? { unique: true } : {}),
      ...(index.partialFilter ? { partialFilterExpression: index.partialFilter } : {}),
    });
  }
  return mongoose.models[name] ?? mongoose.model(name, schema, collection);
}
