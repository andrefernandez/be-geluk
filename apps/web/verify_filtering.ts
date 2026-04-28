
import { prisma } from "./src/lib/prisma";

async function verify() {
  console.log("Verificando filtragem de clientes...");
  
  // Lista alguns usuários comerciais para teste (se existirem)
  const comerciais = await prisma.user.findMany({
    where: { role: "COMERCIAL" }
  });

  if (comerciais.length === 0) {
    console.log("Nenhum usuário comercial encontrado no banco para teste.");
    return;
  }

  for (const user of comerciais) {
    console.log(`\nTestando para usuário: ${user.name} (ID: ${user.id})`);
    
    const clients = await prisma.client.findMany({
      where: { representativeId: user.id }
    });
    
    console.log(`- Clientes atribuídos: ${clients.length}`);
    
    const operations = await prisma.operation.findMany({
      where: { client: { representativeId: user.id } }
    });
    
    console.log(`- Operações visíveis: ${operations.length}`);
    
    const agreements = await prisma.agreement.findMany({
      where: { client: { representativeId: user.id } }
    });
    
    console.log(`- Acordos visíveis: ${agreements.length}`);
  }
}

verify().catch(console.error);
