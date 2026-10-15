import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAcceptanceTarget} from '../scripts/seed-workspace-acceptance.mjs';
test('Product acceptance seed refuses system Mongo, remote, production and other databases',()=>{
 validateAcceptanceTarget({nodeEnv:'development',mongoUri:'mongodb://127.0.0.1:27018/workflow_dev?replicaSet=rs0'});
 for(const config of [
  {nodeEnv:'production',mongoUri:'mongodb://127.0.0.1:27018/workflow_dev'},
  {nodeEnv:'development',mongoUri:'mongodb://127.0.0.1:27017/workflow_dev'},
  {nodeEnv:'development',mongoUri:'mongodb://example.com:27018/workflow_dev'},
  {nodeEnv:'development',mongoUri:'mongodb://localhost:27018/another_db'},
 ])assert.throws(()=>validateAcceptanceTarget(config),/ACCEPTANCE_LOCAL_DEV_ONLY/u);
});
