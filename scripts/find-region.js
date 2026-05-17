import pg from 'pg';
const { Client } = pg;

const regions = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1', 'ap-south-1', 'sa-east-1'];

async function tryRegions() {
  for (const r of regions) {
    console.log('Trying', r);
    const c = new Client({
      connectionString: `postgresql://postgres.rcbyigozsiinfnlmefcd:Ytallo%401211@aws-0-${r}.pooler.supabase.com:6543/postgres`,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await c.connect();
      console.log('SUCCESS:', r);
      await c.end();
      process.exit(0);
    } catch(e) {
      console.log('FAILED:', r, e.message);
    }
  }
}

tryRegions();
