const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const envPath = path.join(__dirname, '.env');

function switchToPostgres() {
  console.log('🔄 Switching database connection provider back to PostgreSQL...');

  // 1. Modify schema.prisma
  if (fs.existsSync(schemaPath)) {
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Replace datasource block
    schema = schema.replace(
      /datasource db \{[\s\S]*?\}/,
      `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`
    );

    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('✅ Updated prisma/schema.prisma to use "postgresql" provider.');
  } else {
    console.error('❌ Could not find prisma/schema.prisma');
    return;
  }

  // 2. Modify .env
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace DATABASE_URL line
    envContent = envContent.replace(
      /DATABASE_URL=".*?"/,
      'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crrs?schema=public"'
    );
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Updated backend/.env with PostgreSQL connection string.');
  } else {
    console.log('⚠️ No .env file found to update.');
  }

  console.log('\n🎉 Successfully switched back to PostgreSQL!');
  console.log('👉 Note: To run locally with Postgres, make sure Postgres is running and port 5432 is open.');
}

switchToPostgres();
