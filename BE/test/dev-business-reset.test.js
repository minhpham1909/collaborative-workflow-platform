import {test} from 'node:test';
import assert from 'node:assert/strict';
import {models} from '../src/models/index.js';
import {validateResetTarget,resetBusinessCollections,preservedAccountCollections} from '../src/workspace-only/dev-reset.js';
test('Reset preserves account collections and classifies every core collection without dropping indexes',()=>{
 const actual=Object.values(models).map(model=>model.collection.name).sort();
 assert.deepEqual([...resetBusinessCollections,...preservedAccountCollections,'email_outbox'].sort(),actual);
 assert.equal(resetBusinessCollections.includes('users'),false);assert.equal(resetBusinessCollections.includes('sessions'),false);
});
test('Reset refuses wrong database/system Mongo/production/remote; accepts only exact dev target',()=>{
 validateResetTarget({nodeEnv:'development',mongoUri:'mongodb://127.0.0.1:27018/workflow_dev?replicaSet=rs0'});
 for(const mongoUri of ['mongodb://127.0.0.1:27017/workflow_dev','mongodb://localhost:27018/another_database','mongodb://example.com:27018/workflow_dev'])assert.throws(()=>validateResetTarget({nodeEnv:'development',mongoUri}));
 assert.throws(()=>validateResetTarget({nodeEnv:'production',mongoUri:'mongodb://127.0.0.1:27018/workflow_dev'}));
});
