const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const envPath = path.join(__dirname, '.env');

function switchToSqlite() {
  console.log('🔄 Switching database connection provider to SQLite...');

  // 1. Modify schema.prisma
  if (fs.existsSync(schemaPath)) {
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Replace datasource block
    schema = schema.replace(
      /datasource db \{[\s\S]*?\}/,
      `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`
    );

    // SQLite doesn't support some relations or attributes in the exact same syntax if they are complex, 
    // but our models are standard and fully compatible. Let's make sure.
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('✅ Updated prisma/schema.prisma to use "sqlite" provider.');
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
      'DATABASE_URL="file:./dev.db"'
    );
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Updated backend/.env with SQLite connection string (file:./dev.db).');
  } else {
    console.log('⚠️ No .env file found to update.');
  }

  console.log('\n🎉 Successfully switched to SQLite!');
  console.log('👉 You can now run:');
  console.log('   npm run prisma:generate');
  console.log('   npx prisma db push');
  console.log('   npm run prisma:seed');
  console.log('   npm run dev');
}

switchToSqlite();
